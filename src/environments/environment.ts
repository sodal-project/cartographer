import packageInfo from '../../package.json'

export const environment = {
  production: false,
  version: packageInfo.version,
  firebaseConfig: {
    apiKey: 'AIzaSyCZCUuI2DzlWwwDOuRzzIpQiJ_4jSg7RrA',
    authDomain: 'explore-a03db.firebaseapp.com',
    projectId: 'explore-a03db',
    storageBucket: 'explore-a03db.firebasestorage.app',
    messagingSenderId: '507004338227',
    appId: '1:507004338227:web:5043e93b116671f24f6346'
  }
}
