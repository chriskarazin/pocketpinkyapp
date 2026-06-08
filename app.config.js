require('dotenv').config();

const appJson = require('./app.json');
const expoConfig = appJson.expo;

module.exports = {
  ...expoConfig,
  owner: 'hasnain87',
  extra: {
    ...expoConfig.extra,
    eas: {
      projectId: "81f578e5-64e4-4c95-9923-1fd6c10ac26d"
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};
