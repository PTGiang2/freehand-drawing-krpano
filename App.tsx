/**
 * 3D Tour Pro - Professional Virtual Tour App
 * Built with MVVM Architecture
 */

import React from 'react';
import { View, StatusBar } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Simple360Painter } from './src/components/Simple360Painter';

const App = observer(() => {
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar hidden={true} />
      <Simple360Painter />
    </View>
  );
});

export default App;
