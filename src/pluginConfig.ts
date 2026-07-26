import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-horizon-distance-fork',
    version: '0.9.6',  
    title: 'Clouds Horizon Distance (Custom Fork)',
    description: 'Displays circles on the Windy map representing horizon distances for different cloud heights with 1-minute time navigation controls.',
    author: 'Pau Verdeguer (forked from Francesco Gola)',
    icon: '☀️',  
    desktopUI: 'embedded',
    mobileUI: 'small',
};

export default config;