import * as React from 'react';
import { ActivityIndicator, Text } from 'react-native-paper';

import Container from './Container';
export default function LoadingIndicator(_props: any) {
  const { style, status, notice, ...props } = _props;
  return (
    <Container style={{ flexGrow: 1, justifyContent: 'center' }}>
      <ActivityIndicator animating size="large" style={[style, { marginTop: 'auto' }]} {...props} />
      {status && <Text style={{ textAlign: 'center', marginTop: 30, marginBottom: 'auto' }}>{status}</Text>}
      {notice && <Text style={{ marginTop: 'auto' }}>{notice}</Text>}
    </Container>
  );
}
