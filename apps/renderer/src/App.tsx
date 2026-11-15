import React from 'react';
import { MainWindow } from './components/layout/MainWindow';
import { Providers } from './providers';

function App() {
  return (
    <Providers>
      <MainWindow />
    </Providers>
  );
}

export default App;