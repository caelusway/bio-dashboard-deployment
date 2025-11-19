#!/usr/bin/env bun
/**
 * Discord Sync and Report Generation Script
 * 
 * This script:
 * 1. Syncs Discord channels to the database
 * 2. Backfills last 7 days of messages
 * 3. Generates weekly reports for each channel
 * 
 * Usage:
 *   bun run scripts/discord-sync-and-report.ts
 */

import { DiscordSyncService } from '../src/services/discord/discordSyncService';
import { DiscordReportService } from '../src/services/discord/discordReportService';

// Environment variables
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

if (!DISCORD_GUILD_ID) {
  console.error('❌ DISCORD_GUILD_ID environment variable is required');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

/**
 * Channel Mappings
 * 
 * STEP 1: Run the discovery script to see your server structure:
 *   bun run scripts/discord-channel-discovery.ts
 * 
 * STEP 2: Update these mappings based on the output
 * 
 * Structure: Each Discord category = One DAO project
 * Each category can have multiple channels (general, topics, design, etc.)
 */
const CHANNEL_MAPPINGS = [
    // ======================================================================
    // D1CKDAO
    // Category: "D1CkDAO"
    // ======================================================================
    {
      channelId: '1400779861869727909',
      daoSlug: 'd1ckdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱d1ckdao-general',
      category: 'D1CkDAO',
      isForum: false,
    },
    {
      channelId: '1400782494684549260',
      daoSlug: 'd1ckdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱d1ckdao-topics',
      category: 'D1CkDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895808664272936',
      daoSlug: 'd1ckdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱d1ckdao-design',
      category: 'D1CkDAO',
      isForum: false,
    },
  
    // ======================================================================
    // NOOTROPICS
    // Category: "Nootropics"
    // ======================================================================
    {
      channelId: '1400779847818547312',
      daoSlug: 'nootropicsdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱nootropics-general',
      category: 'Nootropics',
      isForum: false,
    },
    {
      channelId: '1400782559138549800',
      daoSlug: 'nootropicsdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱nootropics-topics',
      category: 'Nootropics',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895775055319171',
      daoSlug: 'nootropicsdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱nootropics-design',
      category: 'Nootropics',
      isForum: false,
    },
  
    // ======================================================================
    // REFLEXDAO
    // Category: "ReflexDAO"
    // ======================================================================
    {
      channelId: '1400780010565926943',
      daoSlug: 'reflexdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱reflexdao-general',
      category: 'ReflexDAO',
      isForum: false,
    },
    {
      channelId: '1400782549726400564',
      daoSlug: 'reflexdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱reflexdao-topics',
      category: 'ReflexDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895745959301183',
      daoSlug: 'reflexdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱reflexdao-design',
      category: 'ReflexDAO',
      isForum: false,
    },
  
    // ======================================================================
    // MICROBIOMEDAO
    // Category: "MicrobiomeDAO"
    // ======================================================================
    {
      channelId: '1400779999610408981',
      daoSlug: 'microbiomedao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱microbiomedao-general',
      category: 'MicrobiomeDAO',
      isForum: false,
    },
    {
      channelId: '1400782539588636722',
      daoSlug: 'microbiomedao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱microbiomedao-topics',
      category: 'MicrobiomeDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895696953049108',
      daoSlug: 'microbiomedao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱microbiomedao-design',
      category: 'MicrobiomeDAO',
      isForum: false,
    },
  
    // ======================================================================
    // MICRODAO
    // Category: "MicroDAO"
    // ======================================================================
    {
      channelId: '1400779988692893766',
      daoSlug: 'microdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱microdao-general',
      category: 'MicroDAO',
      isForum: false,
    },
    {
      channelId: '1400782526674370590',
      daoSlug: 'microdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱microdao-topics',
      category: 'MicroDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895661834145932',
      daoSlug: 'microdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱microdao-design',
      category: 'MicroDAO',
      isForum: false,
    },
  
    // ======================================================================
    // DOGYEARSDAO
    // Category: "DogYearsDAO"
    // ======================================================================
    {
      channelId: '1400779977175339058',
      daoSlug: 'dogyearsdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱dogyearsdao-general',
      category: 'DogYearsDAO',
      isForum: false,
    },
    {
      channelId: '1400782659390537818',
      daoSlug: 'dogyearsdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱dogyearsdao-topics',
      category: 'DogYearsDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895637771550750',
      daoSlug: 'dogyearsdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱dogyearsdao-design',
      category: 'DogYearsDAO',
      isForum: false,
    },
  
    // ======================================================================
    // SLEEPDAO
    // Category: "SleepDAO"
    // ======================================================================
    {
      channelId: '1400779966458761286',
      daoSlug: 'sleepdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱sleepdao-general',
      category: 'SleepDAO',
      isForum: false,
    },
    {
      channelId: '1400782649047519292',
      daoSlug: 'sleepdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱sleepdao-topics',
      category: 'SleepDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895598622048277',
      daoSlug: 'sleepdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱sleepdao-design',
      category: 'SleepDAO',
      isForum: false,
    },
  
    // ======================================================================
    // FATDAO
    // Category: "FatDAO"
    // ======================================================================
    {
      channelId: '1400779952227483719',
      daoSlug: 'fatdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱fatdao-general',
      category: 'FatDAO',
      isForum: false,
    },
    {
      channelId: '1400782637819236457',
      daoSlug: 'fatdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱fatdao-topics',
      category: 'FatDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895562571874316',
      daoSlug: 'fatdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱fatdao-design',
      category: 'FatDAO',
      isForum: false,
    },
  
    // ======================================================================
    // DALYADAO
    // Category: "DalyaDAO"
    // ======================================================================
    {
      channelId: '1400780522271019059',
      daoSlug: 'dalyadao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱dalyadao-general',
      category: 'DalyaDAO',
      isForum: false,
    },
    {
      channelId: '1400782627182608464',
      daoSlug: 'dalyadao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱dalyadao-topics',
      category: 'DalyaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895535640379444',
      daoSlug: 'dalyadao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱dalyadao-design',
      category: 'DalyaDAO',
      isForum: false,
    },
  
    // ======================================================================
    // KIDNEYDAO
    // Category: "KidneyDAO"
    // ======================================================================
    {
      channelId: '1400780548116316200',
      daoSlug: 'kidneydao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱kidneydao-general',
      category: 'KidneyDAO',
      isForum: false,
    },
    {
      channelId: '1400783284899942412',
      daoSlug: 'kidneydao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱kidneydao-topics',
      category: 'KidneyDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895502677217405',
      daoSlug: 'kidneydao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱kidneydao-design',
      category: 'KidneyDAO',
      isForum: false,
    },
  
    // ======================================================================
    // STEMDAO
    // Category: "StemDAO"
    // ======================================================================
    {
      channelId: '1400780568517677137',
      daoSlug: 'stemdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱stemdao-general',
      category: 'StemDAO',
      isForum: false,
    },
    {
      channelId: '1400783274615242822',
      daoSlug: 'stemdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱stemdao-topics',
      category: 'StemDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895458809118720',
      daoSlug: 'stemdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱stemdao-design',
      category: 'StemDAO',
      isForum: false,
    },
  
    // ======================================================================
    // SPECTRUTHDAO
    // Category: "SpectruthDAO"
    // ======================================================================
    {
      channelId: '1400780604844408982',
      daoSlug: 'spectruthdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱spectruthdao-general',
      category: 'SpectruthDAO',
      isForum: false,
    },
    {
      channelId: '1400783265010552832',
      daoSlug: 'spectruthdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱spectruthdao-topics',
      category: 'SpectruthDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895438177206302',
      daoSlug: 'spectruthdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱spectruthdao-design',
      category: 'SpectruthDAO',
      isForum: false,
    },
  
    // ======================================================================
    // MESOREEFDAO
    // Category: "MesoReefDAO"
    // ======================================================================
    {
      channelId: '1400780636997947462',
      daoSlug: 'mesoreefdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱mesoreefdao-general',
      category: 'MesoReefDAO',
      isForum: false,
    },
    {
      channelId: '1400783213932314666',
      daoSlug: 'mesoreefdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱mesoreefdao-topics',
      category: 'MesoReefDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895378286739537',
      daoSlug: 'mesoreefdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱mesoreefdao-design',
      category: 'MesoReefDAO',
      isForum: false,
    },
  
    // ======================================================================
    // NEWLEAFFINANCE
    // Category: "NewLeafFinance"
    // ======================================================================
    {
      channelId: '1400780681117831263',
      daoSlug: 'newleaffinance', // ⚠️ UPDATE to match your database!
      channelName: '💬︱newleaffinance-general',
      category: 'NewLeafFinance',
      isForum: false,
    },
    {
      channelId: '1400783480463425546',
      daoSlug: 'newleaffinance', // ⚠️ UPDATE to match your database!
      channelName: '📝︱newleaffinance-topics',
      category: 'NewLeafFinance',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895344803483748',
      daoSlug: 'newleaffinance', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱newleaffinance-design',
      category: 'NewLeafFinance',
      isForum: false,
    },
  
    // ======================================================================
    // DERMADAO
    // Category: "DermaDAO"
    // ======================================================================
    {
      channelId: '1400780671064211476',
      daoSlug: 'dermadao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱dermadao-general',
      category: 'DermaDAO',
      isForum: false,
    },
    {
      channelId: '1400783471848460408',
      daoSlug: 'dermadao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱dermadao-topics',
      category: 'DermaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895305637072906',
      daoSlug: 'dermadao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱dermadao-design',
      category: 'DermaDAO',
      isForum: false,
    },
  
    // ======================================================================
    // GENIUSDAO
    // Category: "GeniusDAO"
    // ======================================================================
    {
      channelId: '1400780736973504643',
      daoSlug: 'geniusdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱geniusdao-general',
      category: 'GeniusDAO',
      isForum: false,
    },
    {
      channelId: '1400783571060264970',
      daoSlug: 'geniusdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱geniusdao-topics',
      category: 'GeniusDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895106910945291',
      daoSlug: 'geniusdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱geniusdao-design',
      category: 'GeniusDAO',
      isForum: false,
    },
  
    // ======================================================================
    // GINGERSCIENCE
    // Category: "GingerScience"
    // ======================================================================
    {
      channelId: '1400780760788635768',
      daoSlug: 'gingersciencedao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱gingerscience-general',
      category: 'GingerScience',
      isForum: false,
    },
    {
      channelId: '1400783560322973707',
      daoSlug: 'gingersciencedao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱gingerscience-topics',
      category: 'GingerScience',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895084228415570',
      daoSlug: 'gingersciencedao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱ginger-science-design',
      category: 'GingerScience',
      isForum: false,
    },
  
    // ======================================================================
    // SPINEDAO
    // Category: "SpineDAO"
    // ======================================================================
    {
      channelId: '1400780784431796277',
      daoSlug: 'spinedao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱spinedao-general',
      category: 'SpineDAO',
      isForum: false,
    },
    {
      channelId: '1400783550705303552',
      daoSlug: 'spinedao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱spinedao-topics',
      category: 'SpineDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895050648686632',
      daoSlug: 'spinedao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱spinedao-design',
      category: 'SpineDAO',
      isForum: false,
    },
  
    // ======================================================================
    // CURETOPIA
    // Category: "Curetopia"
    // ======================================================================
    {
      channelId: '1400780807173308568',
      daoSlug: 'curetopiadao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱curetopia-general',
      category: 'Curetopia',
      isForum: false,
    },
    {
      channelId: '1400783638689353748',
      daoSlug: 'curetopiadao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱curetopia-topics',
      category: 'Curetopia',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895021812842537',
      daoSlug: 'curetopiadao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱curetopia-design',
      category: 'Curetopia',
      isForum: false,
    },
  
    // ======================================================================
    // MYCODAO
    // Category: "MycoDAO"
    // ======================================================================
    {
      channelId: '1400780827260096605',
      daoSlug: 'mycodao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱mycodao-general',
      category: 'MycoDAO',
      isForum: false,
    },
    {
      channelId: '1400783623585534149',
      daoSlug: 'mycodao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱mycodao-topics',
      category: 'MycoDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894993904074792',
      daoSlug: 'mycodao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱mycodao-design',
      category: 'MycoDAO',
      isForum: false,
    },
  
    // ======================================================================
    // QUANTUM BIOLOGY DAO
    // Category: "Quantum Biology DAO"
    // ======================================================================
    {
      channelId: '1400780847447277638',
      daoSlug: 'quantumbiodao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱quantum-biology-dao-general',
      category: 'Quantum Biology DAO',
      isForum: false,
    },
    {
      channelId: '1400783678250156072',
      daoSlug: 'quantumbiodao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱quantum-biology-dao-topics',
      category: 'Quantum Biology DAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894960731328552',
      daoSlug: 'quantumbiodao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱quantum-biology-dao-design',
      category: 'Quantum Biology DAO',
      isForum: false,
    },
  
    // ======================================================================
    // LONG COVID LABS
    // Category: "Long Covid Labs"
    // ======================================================================
    {
      channelId: '1400780867969876099',
      daoSlug: 'longcovidlabsdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱long-covid-labs-general',
      category: 'Long Covid Labs',
      isForum: false,
    },
    {
      channelId: '1400783669773467689',
      daoSlug: 'longcovidlabsdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱long-covid-labs-topics',
      category: 'Long Covid Labs',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894872235708586',
      daoSlug: 'longcovidlabsdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱long-covid-labs-design',
      category: 'Long Covid Labs',
      isForum: false,
    },
  
    // ======================================================================
    // CEREBRUM DAO
    // Category: "Cerebrum DAO"
    // ======================================================================
    {
      channelId: '1402725102323503124',
      daoSlug: 'cerebrumdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱cerebrum-dao-general',
      category: 'Cerebrum DAO',
      isForum: false,
    },
    {
      channelId: '1402725306304827565',
      daoSlug: 'cerebrumdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱cerebrum-dao-topics',
      category: 'Cerebrum DAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894778144620606',
      daoSlug: 'cerebrumdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱cerebrum-dao-design',
      category: 'Cerebrum DAO',
      isForum: false,
    },
  
    // ======================================================================
    // VITADAO
    // Category: "VitaDAO"
    // ======================================================================
    {
      channelId: '1402725113882869902',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱vitadao-topics',
      category: 'VitaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1402725365192855684',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱vi̇tadao-general',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433466476299550832',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: 'mid',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433803758931808419',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: 'stem',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433803877026889880',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: 'seno',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433803903132110950',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: 'foxo3',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1439894810784694272',
      daoSlug: 'vitadao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱vitadao-design',
      category: 'VitaDAO',
      isForum: false,
    },
  
    // ======================================================================
    // VALLEYDAO
    // Category: "ValleyDAO"
    // ======================================================================
    {
      channelId: '1402725292690243665',
      daoSlug: 'valleydao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱valleydao-general',
      category: 'ValleyDAO',
      isForum: false,
    },
    {
      channelId: '1402725474282766346',
      daoSlug: 'valleydao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱valleydao-topics',
      category: 'ValleyDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894739632652378',
      daoSlug: 'valleydao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱valleydao-design',
      category: 'ValleyDAO',
      isForum: false,
    },
  
    // ======================================================================
    // HAIRDAO
    // Category: "HairDAO"
    // ======================================================================
    {
      channelId: '1402725455135768576',
      daoSlug: 'hairdao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱hai̇rdao-general',
      category: 'HairDAO',
      isForum: false,
    },
    {
      channelId: '1402725548207243365',
      daoSlug: 'hairdao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱hairdao-topics',
      category: 'HairDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894674402967655',
      daoSlug: 'hairdao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱hairdao-design',
      category: 'HairDAO',
      isForum: false,
    },
  
    // ======================================================================
    // CRYODAO
    // Category: "CryoDAO"
    // ======================================================================
    {
      channelId: '1402725386957357176',
      daoSlug: 'cryodao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱cryodao-topics',
      category: 'CryoDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1402725632105906328',
      daoSlug: 'cryodao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱cryodao-general',
      category: 'CryoDAO',
      isForum: false,
    },
    {
      channelId: '1439894640416395336',
      daoSlug: 'cryodao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱cryodao-design',
      category: 'CryoDAO',
      isForum: false,
    },
  
    // ======================================================================
    // PSYDAO
    // Category: "PsyDAO"
    // ======================================================================
    {
      channelId: '1402725536475910246',
      daoSlug: 'psydao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱psydao-general',
      category: 'PsyDAO',
      isForum: false,
    },
    {
      channelId: '1402725621603500104',
      daoSlug: 'psydao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱psydao-topics',
      category: 'PsyDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894578281971762',
      daoSlug: 'psydao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱psydao-design',
      category: 'PsyDAO',
      isForum: false,
    },
  
    // ======================================================================
    // ATHENADAO
    // Category: "AthenaDAO"
    // ======================================================================
    {
      channelId: '1402725692160082111',
      daoSlug: 'athenadao', // ⚠️ UPDATE to match your database!
      channelName: '📝︱athenadao-topics',
      category: 'AthenaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1402725701211394279',
      daoSlug: 'athenadao', // ⚠️ UPDATE to match your database!
      channelName: '💬︱athenadao-general',
      category: 'AthenaDAO',
      isForum: false,
    },
    {
      channelId: '1439894535235964990',
      daoSlug: 'athenadao', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱athenadao-design',
      category: 'AthenaDAO',
      isForum: false,
    },
  
    // ======================================================================
    // MOLECULE
    // Category: "Molecule"
    // ======================================================================
    {
      channelId: '1405134572550619136',
      daoSlug: 'moleculedao', // ⚠️ UPDATE to match your database!
      channelName: 'molecule-general',
      category: 'Molecule',
      isForum: false,
    },
    {
      channelId: '1405134697788473344',
      daoSlug: 'moleculedao', // ⚠️ UPDATE to match your database!
      channelName: 'molecule-topics',
      category: 'Molecule',
      isForum: true, // Forum - syncs all threads
    },
  
    // ======================================================================
    // NEOPHYTE
    // Category: "Neophyte"
    // ======================================================================
    {
      channelId: '1412849541715070976',
      daoSlug: 'neophyte', // ⚠️ UPDATE to match your database!
      channelName: '💬︱neophyte-general',
      category: 'Neophyte',
      isForum: false,
    },
    {
      channelId: '1412849601836486738',
      daoSlug: 'neophyte', // ⚠️ UPDATE to match your database!
      channelName: '📝︱neophyte-topics',
      category: 'Neophyte',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894434836910132',
      daoSlug: 'neophyte', // ⚠️ UPDATE to match your database!
      channelName: '🎨︱neophyte-design',
      category: 'Neophyte',
      isForum: false,
    },
  
    // ======================================================================
    // GO-CART
    // Category: "GO-CART"
    // ======================================================================
    {
      channelId: '1417408246536474634',
      daoSlug: 'gocart', // ⚠️ UPDATE to match your database!
      channelName: 'go-cart-general',
      category: 'GO-CART',
      isForum: false,
    },
    {
      channelId: '1417408333521883226',
      daoSlug: 'gocart', // ⚠️ UPDATE to match your database!
      channelName: 'go-cart-topics',
      category: 'GO-CART',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894316742082581',
      daoSlug: 'gocart', // ⚠️ UPDATE to match your database!
      channelName: 'go-cart-design',
      category: 'GO-CART',
      isForum: false,
    },
  
    // ======================================================================
    // JDM_IPT
    // Category: "JDM_IPT"
    // ======================================================================
    {
      channelId: '1425355745557483562',
      daoSlug: 'jdmipt', // ⚠️ UPDATE to match your database!
      channelName: 'jdm_general',
      category: 'JDM_IPT',
      isForum: false,
    },
    {
      channelId: '1425355802431983687',
      daoSlug: 'jdmipt', // ⚠️ UPDATE to match your database!
      channelName: 'jdm_topics',
      category: 'JDM_IPT',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894263746924635',
      daoSlug: 'jdmipt', // ⚠️ UPDATE to match your database!
      channelName: 'jdm-design',
      category: 'JDM_IPT',
      isForum: false,
    },
  
    // ======================================================================
    // BLUE SCORPION
    // Category: "Blue Scorpion"
    // ======================================================================
    {
      channelId: '1428680771559886970',
      daoSlug: 'bluescorpion', // ⚠️ UPDATE to match your database!
      channelName: 'bluescorpion_general',
      category: 'Blue Scorpion',
      isForum: false,
    },
    {
      channelId: '1439894213000040498',
      daoSlug: 'bluescorpion', // ⚠️ UPDATE to match your database!
      channelName: 'bluescorpion-design',
      category: 'Blue Scorpion',
      isForum: false,
    },
  
    // ======================================================================
    // SENAI
    // Category: "SenAI"
    // ======================================================================
    {
      channelId: '1431210073862045727',
      daoSlug: 'senai', // ⚠️ UPDATE to match your database!
      channelName: 'senai_general',
      category: 'SenAI',
      isForum: false,
    },
    {
      channelId: '1439894144322633770',
      daoSlug: 'senai', // ⚠️ UPDATE to match your database!
      channelName: 'senai-design',
      category: 'SenAI',
      isForum: false,
    },
  
    // ======================================================================
    // HOLI
    // Category: "Holi"
    // ======================================================================
    {
      channelId: '1434968387615723731',
      daoSlug: 'holi', // ⚠️ UPDATE to match your database!
      channelName: 'holi-general',
      category: 'Holi',
      isForum: false,
    },
    {
      channelId: '1439894061552107612',
      daoSlug: 'holi', // ⚠️ UPDATE to match your database!
      channelName: 'holi-design',
      category: 'Holi',
      isForum: false,
    },
  
    // ======================================================================
    // PHDV-AI
    // Category: "PHDV-AI"
    // ======================================================================
    {
      channelId: '1438189275429470260',
      daoSlug: 'phdvai', // ⚠️ UPDATE to match your database!
      channelName: 'phdv-ai_general',
      category: 'PHDV-AI',
      isForum: false,
    },
    {
      channelId: '1439893996041277494',
      daoSlug: 'phdvai', // ⚠️ UPDATE to match your database!
      channelName: 'phdv-ai-design',
      category: 'PHDV-AI',
      isForum: false,
    },
  
    // ======================================================================
    // RHEUMAAI
    // Category: "RheumaAI"
    // ======================================================================
    {
      channelId: '1440625892106965123',
      daoSlug: 'rheumaai', // ⚠️ UPDATE to match your database!
      channelName: 'rheumaai_general',
      category: 'RheumaAI',
      isForum: false,
    },
  
  ];

async function main() {
  console.log('🚀 Starting Discord Sync and Report Generation...\n');

  const syncService = new DiscordSyncService(DISCORD_BOT_TOKEN as string, DISCORD_GUILD_ID as string);
  const reportService = new DiscordReportService(OPENAI_API_KEY as string);

  try {
    // Step 1: Sync channels
    console.log('📡 Step 1: Syncing Discord channels...');
    await syncService.syncChannels(CHANNEL_MAPPINGS);
    console.log('✅ Channels synced\n');

    

    console.log('🎉 Discord sync and report generation completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await syncService.destroy();
  }
}

main();

