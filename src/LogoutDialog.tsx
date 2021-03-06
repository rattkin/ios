// SPDX-FileCopyrightText: © 2019 EteSync Authors
// SPDX-License-Identifier: GPL-3.0-only

import * as React from 'react';
import { List, Paragraph, Switch, useTheme } from 'react-native-paper';

import { useDispatch } from 'react-redux';
import { persistor } from './store';
import { logout } from './store/actions';

import { SyncManagerAddressBook } from './sync/SyncManagerAddressBook';
import { SyncManagerCalendar } from './sync/SyncManagerCalendar';
import { SyncManagerTaskList } from './sync/SyncManagerTaskList';
import { unregisterSyncTask, SyncManager } from './sync/SyncManager';

import ConfirmationDialog from './widgets/ConfirmationDialog';

import { useRemoteCredentials } from './login';
import { CredentialsData } from './store';

import * as C from './constants';

export default function LogoutDialog(props: { visible: boolean, onDismiss: (loggedOut: boolean) => void }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const etesync = useRemoteCredentials() as CredentialsData;
  const [clearAddressBooks, setClearAddressBooks] = React.useState(true);
  const [clearCalendars, setClearCalendars] = React.useState(true);

  return (
    <ConfirmationDialog
      title="Are you sure?"
      visible={props.visible}
      onOk={async () => {
        if (etesync) {
          const managers = [];
          if (clearAddressBooks) {
            managers.push(SyncManagerAddressBook);
          }
          if (clearCalendars) {
            managers.push(SyncManagerCalendar);
            managers.push(SyncManagerTaskList);
          }

          if (managers.length > 0) {
            const syncManager = SyncManager.getManager(etesync);
            await syncManager.clearDeviceCollections(managers);
          }

          SyncManager.removeManager(etesync);

          unregisterSyncTask(etesync.credentials.email);
        }

        // Here we log out regardless if we actually have an etesync
        dispatch(logout(etesync!));

        persistor.persist();

        props.onDismiss(true);
      }}
      onCancel={() => props.onDismiss(false)}
    >
      <Paragraph>
        Are you sure you would like to log out?
        Logging out will remove your account and all of its data from your device, and unsynced changes WILL be lost.
      </Paragraph>
      {C.syncAppMode && (
        <>
          <Paragraph>
            Additionally, should EteSync calendars and address books be removed from your device when logging out?
          </Paragraph>
          <List.Item
            title="Remove contacts"
            description={(clearAddressBooks) ? 'Removing contacts from device' : 'Keeping contacts on device'}
            right={(props) =>
              <Switch
                {...props}
                color={theme.colors.accent}
                value={clearAddressBooks}
                onValueChange={setClearAddressBooks}
              />
            }
          />
          <List.Item
            title="Remove calendars"
            description={(clearCalendars) ? 'Removing events and reminders from device' : 'Keeping events and reminers on device'}
            right={(props) =>
              <Switch
                {...props}
                color={theme.colors.accent}
                value={clearCalendars}
                onValueChange={setClearCalendars}
              />
            }
          />
        </>
      )}
    </ConfirmationDialog>
  );
}
