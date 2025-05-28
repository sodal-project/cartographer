import packageInfo from '../../package.json'

export const environment = {
  production: false,
  version: packageInfo.version,
  firebaseConfig: {
    apiKey: 'AIzaSyCZCUuI2DzlWwwDOuRzzIpQiJ_4jSg7RrA',
    authDomain: 'cartographer-a03db.firebaseapp.com',
    projectId: 'cartographer-a03db',
    storageBucket: 'cartographer-a03db.firebasestorage.app',
    messagingSenderId: '507004338227',
    appId: '1:507004338227:web:5043e93b116671f24f6346'
  }
}
