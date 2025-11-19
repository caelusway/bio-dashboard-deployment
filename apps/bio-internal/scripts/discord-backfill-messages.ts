#!/usr/bin/env bun
/**
 * Discord Message Backfill Script
 * 
 * This script syncs Discord channels and backfills historical messages
 * WITHOUT generating reports. Run this first to populate the database.
 * 
 * After backfill is complete, run discord-generate-reports.ts to create reports.
 * 
 * Usage:
 *   bun run scripts/discord-backfill-messages.ts [days]
 *   
 * Examples:
 *   bun run scripts/discord-backfill-messages.ts      # Default: 14 days
 *   bun run scripts/discord-backfill-messages.ts 30   # Backfill 30 days
 */

import { DiscordSyncService } from '../src/services/discord/discordSyncService';

// Environment variables
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

if (!DISCORD_GUILD_ID) {
  console.error('❌ DISCORD_GUILD_ID environment variable is required');
  process.exit(1);
}

// Get days from command line argument or default to 14
const daysToBackfill = parseInt(process.argv[2] || '14', 10);

if (isNaN(daysToBackfill) || daysToBackfill < 1) {
  console.error('❌ Invalid days argument. Must be a positive number.');
  process.exit(1);
}

/**
 * Channel Mappings
 * 
 * ✅ Real channel IDs copied from discord-sync-and-report.ts
 * These are the actual Discord channel IDs from your server
 */
const CHANNEL_MAPPINGS = [
    // ======================================================================
    // D1CKDAO
    // Category: "D1CkDAO"
    // ======================================================================
    {
      channelId: '1400779861869727909',
      daoSlug: 'd1ckdao',
      channelName: '💬︱d1ckdao-general',
      category: 'D1CkDAO',
      isForum: false,
    },
    {
      channelId: '1400782494684549260',
      daoSlug: 'd1ckdao',
      channelName: '📝︱d1ckdao-topics',
      category: 'D1CkDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895808664272936',
      daoSlug: 'd1ckdao',
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
      daoSlug: 'nootropicsdao',
      channelName: '💬︱nootropics-general',
      category: 'Nootropics',
      isForum: false,
    },
    {
      channelId: '1400782559138549800',
      daoSlug: 'nootropicsdao',
      channelName: '📝︱nootropics-topics',
      category: 'Nootropics',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895775055319171',
      daoSlug: 'nootropicsdao',
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
      daoSlug: 'reflexdao',
      channelName: '💬︱reflexdao-general',
      category: 'ReflexDAO',
      isForum: false,
    },
    {
      channelId: '1400782549726400564',
      daoSlug: 'reflexdao',
      channelName: '📝︱reflexdao-topics',
      category: 'ReflexDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895745959301183',
      daoSlug: 'reflexdao',
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
      daoSlug: 'microbiomedao',
      channelName: '💬︱microbiomedao-general',
      category: 'MicrobiomeDAO',
      isForum: false,
    },
    {
      channelId: '1400782539588636722',
      daoSlug: 'microbiomedao',
      channelName: '📝︱microbiomedao-topics',
      category: 'MicrobiomeDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895696953049108',
      daoSlug: 'microbiomedao',
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
      daoSlug: 'microdao',
      channelName: '💬︱microdao-general',
      category: 'MicroDAO',
      isForum: false,
    },
    {
      channelId: '1400782526674370590',
      daoSlug: 'microdao',
      channelName: '📝︱microdao-topics',
      category: 'MicroDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895661834145932',
      daoSlug: 'microdao',
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
      daoSlug: 'dogyearsdao',
      channelName: '💬︱dogyearsdao-general',
      category: 'DogYearsDAO',
      isForum: false,
    },
    {
      channelId: '1400782659390537818',
      daoSlug: 'dogyearsdao',
      channelName: '📝︱dogyearsdao-topics',
      category: 'DogYearsDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895637771550750',
      daoSlug: 'dogyearsdao',
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
      daoSlug: 'sleepdao',
      channelName: '💬︱sleepdao-general',
      category: 'SleepDAO',
      isForum: false,
    },
    {
      channelId: '1400782649047519292',
      daoSlug: 'sleepdao',
      channelName: '📝︱sleepdao-topics',
      category: 'SleepDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895598622048277',
      daoSlug: 'sleepdao',
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
      daoSlug: 'fatdao',
      channelName: '💬︱fatdao-general',
      category: 'FatDAO',
      isForum: false,
    },
    {
      channelId: '1400782637819236457',
      daoSlug: 'fatdao',
      channelName: '📝︱fatdao-topics',
      category: 'FatDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895562571874316',
      daoSlug: 'fatdao',
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
      daoSlug: 'dalyadao',
      channelName: '💬︱dalyadao-general',
      category: 'DalyaDAO',
      isForum: false,
    },
    {
      channelId: '1400782627182608464',
      daoSlug: 'dalyadao',
      channelName: '📝︱dalyadao-topics',
      category: 'DalyaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895535640379444',
      daoSlug: 'dalyadao',
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
      daoSlug: 'kidneydao',
      channelName: '💬︱kidneydao-general',
      category: 'KidneyDAO',
      isForum: false,
    },
    {
      channelId: '1400783284899942412',
      daoSlug: 'kidneydao',
      channelName: '📝︱kidneydao-topics',
      category: 'KidneyDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895502677217405',
      daoSlug: 'kidneydao',
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
      daoSlug: 'stemdao',
      channelName: '💬︱stemdao-general',
      category: 'StemDAO',
      isForum: false,
    },
    {
      channelId: '1400783274615242822',
      daoSlug: 'stemdao',
      channelName: '📝︱stemdao-topics',
      category: 'StemDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895458809118720',
      daoSlug: 'stemdao',
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
      daoSlug: 'spectruthdao',
      channelName: '💬︱spectruthdao-general',
      category: 'SpectruthDAO',
      isForum: false,
    },
    {
      channelId: '1400783265010552832',
      daoSlug: 'spectruthdao',
      channelName: '📝︱spectruthdao-topics',
      category: 'SpectruthDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895438177206302',
      daoSlug: 'spectruthdao',
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
      daoSlug: 'mesoreefdao',
      channelName: '💬︱mesoreefdao-general',
      category: 'MesoReefDAO',
      isForum: false,
    },
    {
      channelId: '1400783213932314666',
      daoSlug: 'mesoreefdao',
      channelName: '📝︱mesoreefdao-topics',
      category: 'MesoReefDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895378286739537',
      daoSlug: 'mesoreefdao',
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
      daoSlug: 'newleaffinance',
      channelName: '💬︱newleaffinance-general',
      category: 'NewLeafFinance',
      isForum: false,
    },
    {
      channelId: '1400783480463425546',
      daoSlug: 'newleaffinance',
      channelName: '📝︱newleaffinance-topics',
      category: 'NewLeafFinance',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895344803483748',
      daoSlug: 'newleaffinance',
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
      daoSlug: 'dermadao',
      channelName: '💬︱dermadao-general',
      category: 'DermaDAO',
      isForum: false,
    },
    {
      channelId: '1400783471848460408',
      daoSlug: 'dermadao',
      channelName: '📝︱dermadao-topics',
      category: 'DermaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895305637072906',
      daoSlug: 'dermadao',
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
      daoSlug: 'geniusdao',
      channelName: '💬︱geniusdao-general',
      category: 'GeniusDAO',
      isForum: false,
    },
    {
      channelId: '1400783571060264970',
      daoSlug: 'geniusdao',
      channelName: '📝︱geniusdao-topics',
      category: 'GeniusDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895106910945291',
      daoSlug: 'geniusdao',
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
      daoSlug: 'gingersciencedao',
      channelName: '💬︱gingerscience-general',
      category: 'GingerScience',
      isForum: false,
    },
    {
      channelId: '1400783560322973707',
      daoSlug: 'gingersciencedao',
      channelName: '📝︱gingerscience-topics',
      category: 'GingerScience',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895084228415570',
      daoSlug: 'gingersciencedao',
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
      daoSlug: 'spinedao',
      channelName: '💬︱spinedao-general',
      category: 'SpineDAO',
      isForum: false,
    },
    {
      channelId: '1400783550705303552',
      daoSlug: 'spinedao',
      channelName: '📝︱spinedao-topics',
      category: 'SpineDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895050648686632',
      daoSlug: 'spinedao',
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
      daoSlug: 'curetopiadao',
      channelName: '💬︱curetopia-general',
      category: 'Curetopia',
      isForum: false,
    },
    {
      channelId: '1400783638689353748',
      daoSlug: 'curetopiadao',
      channelName: '📝︱curetopia-topics',
      category: 'Curetopia',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439895021812842537',
      daoSlug: 'curetopiadao',
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
      daoSlug: 'mycodao',
      channelName: '💬︱mycodao-general',
      category: 'MycoDAO',
      isForum: false,
    },
    {
      channelId: '1400783623585534149',
      daoSlug: 'mycodao',
      channelName: '📝︱mycodao-topics',
      category: 'MycoDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894993904074792',
      daoSlug: 'mycodao',
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
      daoSlug: 'quantumbiodao',
      channelName: '💬︱quantum-biology-dao-general',
      category: 'Quantum Biology DAO',
      isForum: false,
    },
    {
      channelId: '1400783678250156072',
      daoSlug: 'quantumbiodao',
      channelName: '📝︱quantum-biology-dao-topics',
      category: 'Quantum Biology DAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894960731328552',
      daoSlug: 'quantumbiodao',
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
      daoSlug: 'longcovidlabsdao',
      channelName: '💬︱long-covid-labs-general',
      category: 'Long Covid Labs',
      isForum: false,
    },
    {
      channelId: '1400783669773467689',
      daoSlug: 'longcovidlabsdao',
      channelName: '📝︱long-covid-labs-topics',
      category: 'Long Covid Labs',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894872235708586',
      daoSlug: 'longcovidlabsdao',
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
      daoSlug: 'cerebrumdao',
      channelName: '💬︱cerebrum-dao-general',
      category: 'Cerebrum DAO',
      isForum: false,
    },
    {
      channelId: '1402725306304827565',
      daoSlug: 'cerebrumdao',
      channelName: '📝︱cerebrum-dao-topics',
      category: 'Cerebrum DAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894778144620606',
      daoSlug: 'cerebrumdao',
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
      daoSlug: 'vitadao',
      channelName: '📝︱vitadao-topics',
      category: 'VitaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1402725365192855684',
      daoSlug: 'vitadao',
      channelName: '💬︱vi̇tadao-general',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433466476299550832',
      daoSlug: 'vitadao',
      channelName: 'mid',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433803758931808419',
      daoSlug: 'vitadao',
      channelName: 'stem',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433803877026889880',
      daoSlug: 'vitadao',
      channelName: 'seno',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1433803903132110950',
      daoSlug: 'vitadao',
      channelName: 'foxo3',
      category: 'VitaDAO',
      isForum: false,
    },
    {
      channelId: '1439894810784694272',
      daoSlug: 'vitadao',
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
      daoSlug: 'valleydao',
      channelName: '💬︱valleydao-general',
      category: 'ValleyDAO',
      isForum: false,
    },
    {
      channelId: '1402725474282766346',
      daoSlug: 'valleydao',
      channelName: '📝︱valleydao-topics',
      category: 'ValleyDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894739632652378',
      daoSlug: 'valleydao',
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
      daoSlug: 'hairdao',
      channelName: '💬︱hai̇rdao-general',
      category: 'HairDAO',
      isForum: false,
    },
    {
      channelId: '1402725548207243365',
      daoSlug: 'hairdao',
      channelName: '📝︱hairdao-topics',
      category: 'HairDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894674402967655',
      daoSlug: 'hairdao',
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
      daoSlug: 'cryodao',
      channelName: '📝︱cryodao-topics',
      category: 'CryoDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1402725632105906328',
      daoSlug: 'cryodao',
      channelName: '💬︱cryodao-general',
      category: 'CryoDAO',
      isForum: false,
    },
    {
      channelId: '1439894640416395336',
      daoSlug: 'cryodao',
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
      daoSlug: 'psydao',
      channelName: '💬︱psydao-general',
      category: 'PsyDAO',
      isForum: false,
    },
    {
      channelId: '1402725621603500104',
      daoSlug: 'psydao',
      channelName: '📝︱psydao-topics',
      category: 'PsyDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894578281971762',
      daoSlug: 'psydao',
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
      daoSlug: 'athenadao',
      channelName: '📝︱athenadao-topics',
      category: 'AthenaDAO',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1402725701211394279',
      daoSlug: 'athenadao',
      channelName: '💬︱athenadao-general',
      category: 'AthenaDAO',
      isForum: false,
    },
    {
      channelId: '1439894535235964990',
      daoSlug: 'athenadao',
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
      daoSlug: 'moleculedao',
      channelName: 'molecule-general',
      category: 'Molecule',
      isForum: false,
    },
    {
      channelId: '1405134697788473344',
      daoSlug: 'moleculedao',
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
      daoSlug: 'neophyte',
      channelName: '💬︱neophyte-general',
      category: 'Neophyte',
      isForum: false,
    },
    {
      channelId: '1412849601836486738',
      daoSlug: 'neophyte',
      channelName: '📝︱neophyte-topics',
      category: 'Neophyte',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894434836910132',
      daoSlug: 'neophyte',
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
      daoSlug: 'gocart',
      channelName: 'go-cart-general',
      category: 'GO-CART',
      isForum: false,
    },
    {
      channelId: '1417408333521883226',
      daoSlug: 'gocart',
      channelName: 'go-cart-topics',
      category: 'GO-CART',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894316742082581',
      daoSlug: 'gocart',
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
      daoSlug: 'jdmipt',
      channelName: 'jdm_general',
      category: 'JDM_IPT',
      isForum: false,
    },
    {
      channelId: '1425355802431983687',
      daoSlug: 'jdmipt',
      channelName: 'jdm_topics',
      category: 'JDM_IPT',
      isForum: true, // Forum - syncs all threads
    },
    {
      channelId: '1439894263746924635',
      daoSlug: 'jdmipt',
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
      daoSlug: 'bluescorpion',
      channelName: 'bluescorpion_general',
      category: 'Blue Scorpion',
      isForum: false,
    },
    {
      channelId: '1439894213000040498',
      daoSlug: 'bluescorpion',
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
      daoSlug: 'senai',
      channelName: 'senai_general',
      category: 'SenAI',
      isForum: false,
    },
    {
      channelId: '1439894144322633770',
      daoSlug: 'senai',
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
      daoSlug: 'holi',
      channelName: 'holi-general',
      category: 'Holi',
      isForum: false,
    },
    {
      channelId: '1439894061552107612',
      daoSlug: 'holi',
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
      daoSlug: 'phdvai',
      channelName: 'phdv-ai_general',
      category: 'PHDV-AI',
      isForum: false,
    },
    {
      channelId: '1439893996041277494',
      daoSlug: 'phdvai',
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
      daoSlug: 'rheumaai',
      channelName: 'rheumaai_general',
      category: 'RheumaAI',
      isForum: false,
    },
  
  ];

async function main() {
  console.log('🚀 Starting Discord Message Backfill...\n');
  console.log(`📅 Backfilling last ${daysToBackfill} days of messages\n`);
  console.log('='.repeat(80));

  const syncService = new DiscordSyncService(DISCORD_BOT_TOKEN as string, DISCORD_GUILD_ID as string);

  try {
    // Step 1: Sync channels to database
    console.log('\n📡 Step 1: Syncing channels to database...\n');
    await syncService.syncChannels(CHANNEL_MAPPINGS);
    console.log('\n✅ Channels synced to database\n');
    console.log('='.repeat(80));

    // Step 2: Backfill messages for each channel
    console.log('\n📥 Step 2: Backfilling messages...\n');
    
    let totalSynced = 0;
    let totalSkipped = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < CHANNEL_MAPPINGS.length; i++) {
      const mapping = CHANNEL_MAPPINGS[i];
      const progress = `[${i + 1}/${CHANNEL_MAPPINGS.length}]`;
      
      try {
        console.log(`${progress} 📥 Syncing: ${mapping.channelName}...`);
        
        const result = await syncService.syncChannelMessages(mapping.channelId, {
          daysBack: daysToBackfill,
          limit: 5000, // Higher limit for backfill
          isForum: mapping.isForum,
        });

        totalSynced += result.syncedCount;
        totalSkipped += result.skippedCount;
        successCount++;

        const forumInfo = mapping.isForum && 'totalThreads' in result 
          ? ` (${result.totalThreads} threads)` 
          : '';
        
        console.log(`${progress} ✅ ${mapping.channelName}: ${result.syncedCount} messages${forumInfo}\n`);
      } catch (error) {
        errorCount++;
        console.error(`${progress} ❌ Error syncing ${mapping.channelName}:`, error);
        console.log(''); // Empty line for readability
      }
    }

    console.log('='.repeat(80));
    console.log('\n📊 BACKFILL SUMMARY\n');
    console.log(`   Channels Processed: ${CHANNEL_MAPPINGS.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📨 Total Messages Synced: ${totalSynced}`);
    console.log(`   ⏭️  Messages Skipped: ${totalSkipped}`);
    console.log(`   📅 Days Backfilled: ${daysToBackfill}`);
    console.log('');
    console.log('='.repeat(80));

    if (errorCount > 0) {
      console.log('\n⚠️  Some channels failed to sync. Check errors above.\n');
    }

    console.log('\n✅ Message backfill completed!\n');
    console.log('💡 Next steps:');
    console.log('   1. Verify messages in database:');
    console.log('      psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM discord_messages;"');
    console.log('');
    console.log('   2. Generate reports:');
    console.log('      bun run discord:generate-reports');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  } finally {
    await syncService.destroy();
  }
}

main();

