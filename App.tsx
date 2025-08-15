/**
 * 3D Tour Pro - Professional Virtual Tour App
 * Built with MVVM Architecture
 */

import React from 'react';
import {View, StatusBar, LogBox} from 'react-native';
import {observer} from 'mobx-react-lite';
import {Simple360Painter} from './src/components/Simple360Painter';

// Suppress WKWebView injectedJavaScript return-type warnings that block touches in dev
LogBox.ignoreLogs([
  'Error evaluating injectedJavaScript',
  'JavaScript execution returned a result of an unsupported type',
]);

const App = observer(() => {
  return (
    <View style={{flex: 1, backgroundColor: 'black'}}>
      <StatusBar hidden={true} />
      <Simple360Painter />
    </View>
  );
});

export default App;
