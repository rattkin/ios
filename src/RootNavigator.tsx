// SPDX-FileCopyrightText: © 2019 EteSync Authors
// SPDX-License-Identifier: GPL-3.0-only

import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import SafeAreaView from 'react-native-safe-area-view';
import { View } from 'react-native';
import { Appbar, Paragraph, useTheme } from 'react-native-paper';

import { Title } from './widgets/Typography';
import LoginScreen from './login/LoginScreen';

import SettingsScreen from './SettingsScreen';
import AboutScreen from './AboutScreen';
import DebugLogsScreen from './DebugLogsScreen';
import HomeScreen from './HomeScreen';
import JournalScreen from './JournalEntriesScreen';
import JournalItemScreen from './JournalItemScreen';
import JournalItemSaveScreen from './JournalItemSaveScreen';
import JournalEditScreen from './JournalEditScreen';
import JournalImportScreen from './JournalImportScreen';
import JournalMembersScreen from './JournalMembersScreen';
import SyncSettings from './sync/SyncSettings';
import Wizard, { WizardNavigationBar, PagePropsType } from './widgets/Wizard';
import { AskForPermissions } from './Permissions';

import { useCredentials } from './login';
import { StoreState } from './store';
import { setSettings } from './store/actions';

import * as C from './constants';
import { isDefined } from './helpers';

const Stack = createStackNavigator();

const wizardPages = [
  (props: PagePropsType) => (
    <>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Title style={{ textAlign: 'center' }}>Welcome to EteSync!</Title>
        <Paragraph style={{ textAlign: 'center' }}>
          Please follow these few quick steps to setup the EteSync app.
        </Paragraph>
      </View>
      <WizardNavigationBar {...props} />
    </>
  ),
  (props: PagePropsType) => (
    <>
      <AskForPermissions />
      <WizardNavigationBar {...props} />
    </>
  ),
  (C.syncAppMode) ?
    (props: PagePropsType) => (
      <>
        <Title>Sync Settings</Title>
        <Paragraph>
          EteSync syncs with your device's existing accounts, so you have to choose an account to sync with to before going forward. For example, if you choose the iCloud account, all of your EteSync data will sync with iCloud.
        </Paragraph>
        <Paragraph>
          iOS doesn't expose the "local" account unless all other accounts are disabled. Therefore, in order to only sync EteSync with your device, please first turn off iCloud sync for contacts, calendars and reminders (or only some of them) from the device's Settings app.
        </Paragraph>
        <SyncSettings />
        <WizardNavigationBar {...props} />
      </>
    ) : undefined,
].filter(isDefined);

const MenuButton = React.memo(function MenuButton() {
  const navigation = useNavigation() as DrawerNavigationProp<any>;
  return (
    <Appbar.Action icon="menu" accessibilityLabel="Main menu" onPress={() => navigation.openDrawer()} />
  );
});

export default React.memo(function _AuthLoadingScreen() {
  const settings = useSelector((state: StoreState) => state.settings);
  const dispatch = useDispatch();
  const credentials = useCredentials();
  const theme = useTheme();

  if (!settings.ranWizrd) {
    return (
      <>
        <SafeAreaView />
        <Wizard pages={wizardPages} onFinish={() => dispatch(setSettings({ ranWizrd: true }))} style={{ flex: 1 }} />
      </>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#000000',
        headerBackTitleVisible: false,
        headerBackTitleStyle: {
          backgroundColor: 'black',
        },
      }}
    >
      {(credentials === null) ? (
        <>
          <Stack.Screen
            name="LoginScreen"
            component={LoginScreen}
            options={{
              title: 'Login',
              headerLeft: () => (
                <MenuButton />
              ),
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="home"
            component={HomeScreen}
            options={{
              title: C.appName,
              headerLeft: () => (
                <MenuButton />
              ),
            }}
          />
          <Stack.Screen
            name="Journal"
            component={JournalScreen}
            options={{
              title: 'Journal Entries',
            }}
          />
          <Stack.Screen
            name="JournalNew"
            component={JournalEditScreen}
            options={{
              title: 'Journal New',
            }}
          />
          <Stack.Screen
            name="JournalEdit"
            component={JournalEditScreen}
            options={{
              title: 'Journal Edit',
            }}
          />
          <Stack.Screen
            name="JournalItem"
            component={JournalItemScreen}
            options={{
              title: 'Journal Item',
            }}
          />
          <Stack.Screen
            name="JournalItemSave"
            component={JournalItemSaveScreen}
            options={{
              title: 'Save Item',
            }}
          />
          <Stack.Screen
            name="JournalImport"
            component={JournalImportScreen}
            options={{
              title: 'Import',
            }}
          />
          <Stack.Screen
            name="JournalMembers"
            component={JournalMembersScreen}
            options={{
              title: 'Journal Members',
            }}
          />
        </>
      )}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen
        name="DebugLogs"
        component={DebugLogsScreen}
        options={{
          title: 'View Debug Logs',
        }}
      />
    </Stack.Navigator>
  );
});
