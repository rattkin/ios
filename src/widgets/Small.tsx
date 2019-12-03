import * as React from 'react';

import { Text } from 'react-native';

export default React.memo(function JournalItemTask(props: React.PropsWithChildren<{}>) {

  return (
    <Text style={{ fontSize: 10 }}>{props.children}</Text>
  );
});
