import packageInfo from '../../package.json'

export const environment = {
  production: false,
  version: packageInfo.version,
  firebaseConfig: {
    apiKey: 'AIzaSyAE51-19a35ObDktOabeqHuXNxUKAtNgaI',
    authDomain: 'atlas-directory-client.firebaseapp.com',
    projectId: 'atlas-directory-client',
    storageBucket: 'atlas-directory-client.firebasestorage.app',
    messagingSenderId: '53180776924',
    appId: '1:53180776924:web:b317c52087c94c6956cf19'
  }
}
