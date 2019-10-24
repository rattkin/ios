import * as EteSync from '../api/EteSync';
import * as ICAL from 'ical.js';
import * as Calendar from 'expo-calendar';

import { logger } from '../logging';

import { SyncInfo, SyncInfoJournal } from '../SyncGate';
import { store, SyncStateJournalEntryData } from '../store';
import { unsetSyncStateJournal } from '../store/actions';

import { eventVobjectToNative, eventNativeToVobject, entryNativeHashCalc, NativeBase, NativeEvent } from './helpers';
import { colorIntToHtml } from '../helpers';
import { PimType, EventType } from '../pim-types';

import { SyncManagerBase } from './SyncManagerBase';

const ACCOUNT_NAME = 'etesync';

export abstract class SyncManagerCalendarBase<T extends PimType, N extends NativeBase> extends SyncManagerBase<T, N> {
  protected abstract collectionType: string;
  protected abstract entityType: string;

  protected localSource: Calendar.Source;

  public async init() {
    this.localSource = (await Calendar.getSourcesAsync()).find((source) => (source.name === ACCOUNT_NAME));
  }

  public async clearDeviceCollections() {
    const storeState = store.getState();
    const etesync = this.etesync;
    const localSource = this.localSource;
    const syncStateJournals = storeState.sync.stateJournals.asMutable();
    const syncStateEntries = storeState.sync.stateEntries.asMutable();

    const calendars = await Calendar.getCalendarsAsync(this.entityType);
    for (const calendar of calendars) {
      if (calendar.source.id === localSource.id) {
        logger.info(`Deleting ${calendar.title}`);
        await Calendar.deleteCalendarAsync(calendar.id);
      }
    }

    syncStateJournals.forEach((journal) => {
      store.dispatch(unsetSyncStateJournal(etesync, journal));
      syncStateJournals.delete(journal.uid);

      // Deletion from the store happens automatically
      syncStateEntries.delete(journal.uid);

      return true;
    });
  }

  protected async createJournal(syncJournal: SyncInfoJournal): Promise<string> {
    const localSource = this.localSource;
    const collection = syncJournal.collection;

    return Calendar.createCalendarAsync({
      sourceId: localSource.id,
      entityType: this.entityType,
      title: collection.displayName,
      color: colorIntToHtml(collection.color),
    });
  }

  protected async updateJournal(containerLocalId: string, syncJournal: SyncInfoJournal) {
    const localSource = this.localSource;
    const collection = syncJournal.collection;

    Calendar.updateCalendarAsync(containerLocalId, {
      sourceId: localSource.id,
      title: collection.displayName,
      color: colorIntToHtml(collection.color),
    });
  }

  protected async deleteJournal(containerLocalId: string) {
    return Calendar.deleteCalendarAsync(containerLocalId);
  }
}


export class SyncManagerCalendar extends SyncManagerCalendarBase<EventType, NativeEvent> {
  protected collectionType = 'CALENDAR';
  protected entityType = Calendar.EntityTypes.EVENT;

  protected async syncPush(syncInfo: SyncInfo) {
    const syncStateJournals = this.syncStateJournals;
    const now = new Date();
    const dateYearRange = 4; // Maximum year range supported on iOS

    for (const syncJournal of syncInfo.values()) {
      if (syncJournal.collection.type !== this.collectionType) {
        continue;
      }

      const handled = {};
      const collection = syncJournal.collection;
      const uid = collection.uid;
      logger.info(`Pushing ${uid}`);

      const syncStateEntriesReverse = this.syncStateEntries.get(uid).mapEntries((_entry) => {
        const entry = _entry[1];
        return [entry.localId, entry];
      }).asMutable();

      const syncEntries: EteSync.SyncEntry[] = [];

      const syncStateJournal = syncStateJournals.get(uid);
      const localId = syncStateJournal.localId;
      for (let i = -2 ; i <= 1 ; i++) {
        const eventsRangeStart = new Date(new Date().setFullYear(now.getFullYear() + (i * dateYearRange)));
        const eventsRangeEnd = new Date(new Date().setFullYear(now.getFullYear() + ((i + 1) * dateYearRange)));

        const existingEvents = await Calendar.getEventsAsync([localId], eventsRangeStart, eventsRangeEnd);
        existingEvents.forEach((_event) => {
          if (handled[_event.id]) {
            return;
          }
          handled[_event.id] = true;

          const syncStateEntry = syncStateEntriesReverse.get(_event.id);

          // FIXME: ignore recurring events at the moment as they seem to be broken with Expo
          if (_event.recurrenceRule) {
            return;
          }

          const event = { ..._event, uid: (syncStateEntry) ? syncStateEntry.uid : _event.id };
          const syncEntry = this.syncPushHandleAddChange(syncJournal, syncStateEntry, event);
          if (syncEntry) {
            syncEntries.push(syncEntry);
          }

          if (syncStateEntry) {
            syncStateEntriesReverse.delete(syncStateEntry.uid);
          }
        });
      }

      for (const syncStateEntry of syncStateEntriesReverse.values()) {
        // Deleted
        let existingEvent: Calendar.Event;
        try {
          existingEvent = await Calendar.getEventAsync(syncStateEntry.localId);
        } catch (e) {
          // Skip
        }

        // FIXME: handle the case of the event still existing for some reason.
        if (!existingEvent) {
          // If the event still exists it means it's not deleted.
          const syncEntry = this.syncPushHandleDeleted(syncJournal, syncStateEntry);
          if (syncEntry) {
            syncEntries.push(syncEntry);
          }
        }
      }

      this.pushJournalEntries(syncJournal, syncEntries);
    }
  }

  protected syncEntryToVobject(syncEntry: EteSync.SyncEntry) {
    return EventType.fromVCalendar(new ICAL.Component(ICAL.parse(syncEntry.content)));
  }

  protected nativeToVobject(nativeItem: NativeEvent) {
    return eventNativeToVobject(nativeItem);
  }

  protected async processSyncEntry(containerLocalId: string, syncEntry: EteSync.SyncEntry, syncStateEntries: SyncStateJournalEntryData) {
    const event = this.syncEntryToVobject(syncEntry);
    const nativeEvent = eventVobjectToNative(event);
    let syncStateEntry = syncStateEntries.get(event.uid);
    switch (syncEntry.action) {
      case EteSync.SyncEntryAction.Add:
      case EteSync.SyncEntryAction.Change:
        let existingEvent: Calendar.Event;
        try {
          existingEvent = await Calendar.getEventAsync(syncStateEntry.localId);
        } catch (e) {
          // Skip
        }
        if (syncStateEntry && existingEvent) {
          await Calendar.updateEventAsync(syncStateEntry.localId, nativeEvent);
        } else {
          const localEntryId = await Calendar.createEventAsync(containerLocalId, nativeEvent);
          syncStateEntry = {
            uid: nativeEvent.uid,
            localId: localEntryId,
            lastHash: '',
          };
        }

        const createdEvent = { ...await Calendar.getEventAsync(syncStateEntry.localId), uid: nativeEvent.uid };
        syncStateEntry.lastHash = entryNativeHashCalc(createdEvent);

        break;
      case EteSync.SyncEntryAction.Delete:
        if (syncStateEntry) {
          // FIXME: Shouldn't have this if, it should just work
          await Calendar.deleteEventAsync(syncStateEntry.localId);
        }
        break;
    }

    return syncStateEntry;
  }
}
