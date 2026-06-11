import { buildDashboardHTML } from '../src/views/dashboard.js';

const dummyT: Record<string, string> = {};
const keys = [
  'title','newProject','masterPrompt','masterPromptPlaceholder','productionNotes',
  'productionNotesPlaceholder','characterFeatures','characterFeaturesPlaceholder','refImage',
  'playlistTarget','playlistTargetPlaceholder','videoOptions','hasShorts','hasSubtitles',
  'differentiationLayout','publishPlatforms','addToQueue','studioQueue','jobsLabel',
  'completedProjects','projectsLabel','noActiveJobs','noCompletedJobs',
  'differentiationDurationMode','same','shorter','longer',
  'logout','helpTitle','settingsTitle','oppTitle','brandSubtitle',
  'settingsAppearanceTab','settingsLanguageTab','settingsAccountTab','production108',
  'colorTheme','pickapremiumcol109','standard110','darkonly111',
  'lightDarkMode','switchbetweenli112','light','dark',
  'themetransition113','smoothtransitio114','enableanimation115',
  'chooseLanguage','chooseyourprefe116','turkishinterfac117','englishinterfac118',
  'personalAvatar','uploadyourprofi119',
  'textGridPosition','textpositioning120','topLeft','topRight','center','bottomLeft','bottomRight',
  'narratorTone','defaultnarrator121','defaultNarratorPlaceholder',
  'apikeyforyoutub122','wav2liplipsync123','reallipsyncviaw124','enablelipsync125',
  'endscreenoverla126','addsavatarwatch127','enableendscreen128',
  'saveSettings','helpSearchPlaceholder','shortcutHintText','close',
  'colabgpustatus129','status130','gpumemory131','uptime132','error133','start134','stop135',
  'pickyourinteres77','addkeywordsorni78','typeaninteresta79','add80',
  'selected81','notagsyet82','languages83','suggestions84',
  'searchopportuni85','back86','searchquery87','refresh88',
  'differentiatevi89','targetlanguage90','videoduration91','same92','scenes93',
  'shorter94','longer95','processsummary96','transcripextra97','textcleanedwith98',
  'translatedtotar99','afterapprovalsc100','generatetransla101',
  'originaltranscr102','cleanedtranscri103','translatedtexte104','chars105',
  'cancel106','approvegenerate107','cancel76'
];
keys.forEach(k => dummyT[k] = k);

const html = buildDashboardHTML({
  currentLang: 'tr',
  currentTheme: 'default',
  t: dummyT,
  user: { username: 'test' },
  queueJobs: [],
  completedJobs: [],
  themeStyles: '',
  isDark: false
});

console.log('Has tts_provider:', html.includes('tts_provider'));
const selectRegex = /<select\s+[^>]*name="([^"]+)"/g;
let match;
const selects: string[] = [];
while ((match = selectRegex.exec(html)) !== null) {
  selects.push(match[1]);
}
console.log('Selects found:', selects);
