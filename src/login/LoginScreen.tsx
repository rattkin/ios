import * as React from 'react';
import { useDispatch } from 'react-redux';

import { Headline, Paragraph, Text } from 'react-native-paper';
import { NavigationScreenProp } from 'react-navigation';

import Container from '../widgets/Container';
import LoginForm from '../components/LoginForm';
// import EncryptionLoginForm from './components/EncryptionLoginForm';
const EncryptionLoginForm = (props: any) => <Text>EncryptionLoginForm</Text>;

import { login, deriveKey } from '../store/actions';

import * as C from '../constants';

import { useCredentials } from './';

interface PropsType {
  navigation: NavigationScreenProp<void>;
}

const LoginScreen = React.memo(function _LoginScreen(props: PropsType) {
  const credentials = useCredentials();
  const dispatch = useDispatch();
  const { navigation } = props;

  function onFormSubmit(username: string, password: string, encryptionPassword: string, serviceApiUrl?: string) {
    serviceApiUrl = serviceApiUrl ? serviceApiUrl : C.serviceApiBase;
    dispatch<any>(login(username, password, encryptionPassword, serviceApiUrl)).then(() => {
      navigation.navigate('App');
    });
  }

  function onEncryptionFormSubmit(encryptionPassword: string) {
    dispatch<any>(deriveKey(credentials.value!.credentials.email, encryptionPassword)).then(() => {
      navigation.navigate('App');
    });
  }

  if (credentials.value === null) {
    return (
      <Container>
        <Headline>Please Log In</Headline>
        <LoginForm
          onSubmit={onFormSubmit}
          error={credentials.error}
          loading={credentials.fetching}
        />
      </Container>
    );
  } else if (credentials.value.encryptionKey === null) {
    return (
      <Container>
        <Headline>Encryption Password</Headline>
        <Paragraph>
          You are logged in as <Text style={{fontWeight: 'bold'}}>{credentials.value.credentials.email}</Text>.
          Please enter your encryption password to continue, or log out from the side menu.
        </Paragraph>
      <EncryptionLoginForm
        onSubmit={onEncryptionFormSubmit}
      />
      </Container>
    );
  }

  return <React.Fragment />;
});

export default LoginScreen;