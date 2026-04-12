const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerZIP } = require('@electron-forge/maker-zip');
const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Forge',
    executableName: 'forge',
    icon: path.join(__dirname, '..', 'public', 'logo'), 
    asar: true,
    extraResource: [
      '../dist', 
      '../server',
      '../.env'
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Forge',
        authors: 'Forge Team',
        description: 'AI-powered social media management platform',
        setupIcon: path.join(__dirname, '..', 'public', 'logo.ico'),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
};
