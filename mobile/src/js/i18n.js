/**
 * Kabadiwala Connect — Internationalization (i18n) & Web Speech API Engine
 * Supports 8 Languages:
 *   - en: English (Default)
 *   - hi: हिन्दी (Hindi)
 *   - mr: मराठी (Marathi)
 *   - ta: தமிழ் (Tamil)
 *   - te: తెలుగు (Telugu)
 *   - ml: മലയാളം (Malayalam)
 *   - kn: ಕನ್ನಡ (Kannada)
 *   - bn: বাংলা (Bengali)
 *
 * Includes zero-API-key in-browser speech synthesis for low-literacy field users.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', voiceLang: 'en-IN', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceLang: 'hi-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', voiceLang: 'mr-IN', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceLang: 'ta-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceLang: 'te-IN', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceLang: 'kn-IN', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceLang: 'ml-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', voiceLang: 'bn-IN', flag: '🇮🇳' }
];

export const TRANSLATIONS = {
  en: {
    appTitle: 'Kabadiwala Connect',
    collectorTitle: 'Kabadiwala Lite',
    dealerTitle: 'Dealer Operational Suite',
    selectApp: 'Select the app to launch',
    collectorSubtitle: 'On-device ML scrap classification & valuation for door-to-door collectors',
    scannerTab: 'Scrap Scanner',
    priceBoardTab: 'Price Board',
    materialGuideTab: 'Material Guide',
    homeTab: 'Home',
    purchaseTab: 'Purchase',
    stockTab: 'Stock',
    lotsTab: 'Lots',
    ledgerTab: 'Ledger',
    snapPhoto: 'Snap Scrap Photo',
    choosePhoto: 'Choose Photo',
    positionScrap: 'Position scrap inside frame',
    mlAssistance: 'ML Assistance: The classifier suggests material category. You can confirm or change anytime.',
    quickTestSamples: 'Quick Test Scrap Samples',
    detectedCategory: 'Detected Material',
    confidence: 'Confidence',
    confirmCategory: '✓ Confirm Category',
    changeCategory: '✎ Change Category',
    manualSelection: 'Manual Category Selection',
    manualDesc: 'Select category manually if model is uncertain',
    weightCalculatorTitle: 'Instant Value Calculator',
    approxWeight: 'Approximate Weight (kg)',
    enterWeight: 'Enter weight...',
    quickChips: 'Quick Weights',
    estimatedValue: 'Estimated Scrap Value',
    marketRange: 'Market Range',
    listenEstimate: '🔊 Listen to Value',
    listenAllRates: '🔊 Listen to All Rates',
    listenSafety: '🔊 Listen to Safety Advice',
    speaking: 'Speaking...',
    priceBoardTitle: 'Live Scrap Market Rates & Trends',
    priceBoardSubtitle: 'Prevailing wholesale rates per kg with 30-day price trends',
    prevailingRate: 'Prevailing Rate',
    trendRising: 'Rising',
    trendFalling: 'Falling',
    trendStable: 'Stable',
    safetyWarning: 'Safety Hazard',
    recyclability: 'Recyclability',
    fieldTip: 'Field Sorting Tip',
    online: 'Online',
    offline: 'Simulated Offline',
    syncNow: 'Sync Now',
    pendingSync: 'purchases pending sync',
    gpsSearching: 'Acquiring GPS...',
    gpsLocked: 'GPS Stamped',
    language: 'Language',
    selectLanguage: 'Choose Your Language',
    categories: {
      'PCB': 'Printed Circuit Boards (PCB)',
      'CRT': 'Cathode Ray Tube (CRT)',
      'LCD': 'Liquid Crystal Display (LCD)',
      'Cable': 'Copper & Aluminum Cables',
      'Battery': 'Batteries (Li-ion/Lead-Acid)',
      'Motor/Magnet': 'Motors & Magnets',
      'Mixed Plastic': 'Mixed E-Waste Plastics'
    },
    speech: {
      valuation: 'For {weight} kilograms of {category}, your estimated scrap value is {value} rupees. Prevailing market range is {min} to {max} rupees.',
      priceSummary: 'Today\'s prevailing e-waste scrap rates per kilogram: PCB is 450 rupees, Cable is 320 rupees, LCD panels are 180 rupees, Batteries are 95 rupees, Motors and magnets are 90 rupees, CRT monitors are 45 rupees, and Mixed plastic is 35 rupees.'
    }
  },
  hi: {
    appTitle: 'कबाड़ीवाला कनेक्ट',
    collectorTitle: 'कबाड़ीवाला लाइट',
    dealerTitle: 'डीलर संचालन ऐप',
    selectApp: 'ऐप चुनें',
    collectorSubtitle: 'घूम-घूम कर कबाड़ इकट्ठा करने वालों के लिए ऑन-डिवाइस पहचान और मूल्य अनुमान',
    scannerTab: 'कबाड़ स्कैनर',
    priceBoardTab: 'भाव तालिका (रेट)',
    materialGuideTab: 'सुरक्षा मार्गदर्शिका',
    homeTab: 'होम',
    purchaseTab: 'खरीद दर्ज करें',
    stockTab: 'स्टॉक',
    lotsTab: 'लॉट',
    ledgerTab: 'खाता-बही',
    snapPhoto: 'कबाड़ का फोटो लें',
    choosePhoto: 'गैलरी से चुनें',
    positionScrap: 'कबाड़ को फ्रेम के अंदर रखें',
    mlAssistance: 'स्मार्ट पहचान: सिस्टम कबाड़ का प्रकार सुझाता है। आप पुष्टि या बदलाव कर सकते हैं।',
    quickTestSamples: 'नमूना कबाड़ (तुरंत जांचें)',
    detectedCategory: 'पहचाना गया कबाड़',
    confidence: 'सटीकता',
    confirmCategory: '✓ सही है (पुष्टि करें)',
    changeCategory: '✎ बदलें',
    manualSelection: 'कबाड़ प्रकार खुद चुनें',
    manualDesc: 'यदि सिस्टम तय न कर सके, तो सूची से चुनें',
    weightCalculatorTitle: 'तुरंत मूल्य कैलकुलेटर (अनुमान)',
    approxWeight: 'अनुमानित वजन (किलो)',
    enterWeight: 'वजन डालें...',
    quickChips: 'त्वरित वजन',
    estimatedValue: 'अनुमानित कुल मूल्य',
    marketRange: 'बाज़ार दर सीमा',
    listenEstimate: '🔊 बोल कर सुनें',
    listenAllRates: '🔊 सभी रेट सुनें',
    listenSafety: '🔊 सुरक्षा सलाह सुनें',
    speaking: 'सुनाया जा रहा है...',
    priceBoardTitle: 'कबाड़ बाजार भाव और रुझान',
    priceBoardSubtitle: 'प्रचलित थोक दरें (प्रति किलो) और पिछले 30 दिनों का रुझान',
    prevailingRate: 'वर्तमान दर',
    trendRising: 'बढ़ रहा है',
    trendFalling: 'घट रहा है',
    trendStable: 'स्थिर',
    safetyWarning: 'सुरक्षा चेतावनी',
    recyclability: 'पुनर्चक्रण (रिसाइक्लिंग)',
    fieldTip: 'सॉर्टिंग सुझाव',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन मोड',
    syncNow: 'अभी सिंक करें',
    pendingSync: 'खरीद सिंक होना बाकी है',
    gpsSearching: 'जीपीएस खोजा जा रहा है...',
    gpsLocked: 'जीपीएस दर्ज',
    language: 'भाषा',
    selectLanguage: 'अपनी भाषा चुनें',
    categories: {
      'PCB': 'पीसीबी (सर्किट बोर्ड)',
      'CRT': 'सीआरटी (पुराना टीवी/मॉनिटर)',
      'LCD': 'एलसीडी स्क्रीन/पैनल',
      'Cable': 'तांबा व एल्युमिनियम तार (केबल)',
      'Battery': 'बैटरी (लिथियम/लेड)',
      'Motor/Magnet': 'मोटर और चुंबक',
      'Mixed Plastic': 'मिश्रित ई-कचरा प्लास्टिक'
    },
    speech: {
      valuation: 'आपके {weight} किलो {category} का भाव, लगभग {value} रुपये। बाजार में इसकी कीमत {min} से {max} रुपये तक जाती हैं।',
      priceSummary: 'आज के ई-कचरा थोक भाव प्रति किलो इस प्रकार हैं: पीसीबी चार सौ पचास रुपये, तार तीन सौ बीस रुपये, एलसीडी एक सौ अस्सी रुपये, बैटरी पचानवे रुपये, मोटर व चुंबक नब्बे रुपये, सीआरटी पैंतालीस रुपये, और मिश्रित प्लास्टिक पैंतीस रुपये।'
    }
  },
  mr: {
    appTitle: 'कबाडीवाला कनेक्ट',
    collectorTitle: 'कबाडीवाला लाइट',
    dealerTitle: 'डीलर व्यवस्थापन',
    selectApp: 'अ‍ॅप निवडा',
    collectorSubtitle: 'घरोघरी भंगार गोळा करणाऱ्यांसाठी डिजिटल ओळख आणि तत्काळ किंमत अंदाज',
    scannerTab: 'भंगार स्कॅनर',
    priceBoardTab: 'बाजार भाव',
    materialGuideTab: 'सुरक्षा मार्गदर्शक',
    homeTab: 'होम',
    purchaseTab: 'खरेदी नोंद',
    stockTab: 'साठा (स्टॉक)',
    lotsTab: 'लॉट',
    ledgerTab: 'हिशोब वही',
    snapPhoto: 'भंगाराचा फोटो काढा',
    choosePhoto: 'गॅलरीतून निवडा',
    positionScrap: 'भंगार फ्रेमच्या आत ठेवा',
    mlAssistance: 'स्मार्ट ओळख: मॉडेल भंगाराचा प्रकार सुचवते. तुम्ही पुष्टी किंवा बदल करू शकता.',
    quickTestSamples: 'नमुना भंगार (चाचणी)',
    detectedCategory: 'ओळखलेला प्रकार',
    confidence: 'अचूकता',
    confirmCategory: '✓ बरोबर आहे',
    changeCategory: '✎ प्रकार बदला',
    manualSelection: 'स्वतः प्रकार निवडा',
    manualDesc: 'अंदाजात शंका असल्यास यादीतून निवडा',
    weightCalculatorTitle: 'किंमत कॅल्क्युलेटर (अंदाज)',
    approxWeight: 'अंदाजे वजन (किलो)',
    enterWeight: 'वजन टाका...',
    quickChips: 'जलद वजन',
    estimatedValue: 'अंदाजे एकूण किंमत',
    marketRange: 'बाजार भाव श्रेणी',
    listenEstimate: '🔊 ऐका (किंमत)',
    listenAllRates: '🔊 सर्व दर ऐका',
    listenSafety: '🔊 सुरक्षा नियम ऐका',
    speaking: 'वाचत आहे...',
    priceBoardTitle: 'भंगार बाजार भाव व कल',
    priceBoardSubtitle: 'प्रति किलो चालू घाऊक दर आणि ३० दिवसांचा बाजाराचा कल',
    prevailingRate: 'चालू दर',
    trendRising: 'वाढत आहे',
    trendFalling: 'कमी होत आहे',
    trendStable: 'स्थिर',
    safetyWarning: 'धोकादायक चेतावणी',
    recyclability: 'पुनर्वापर क्षमता',
    fieldTip: 'वर्गीकरण सल्ला',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन मोड',
    syncNow: 'आता सिंक करा',
    pendingSync: 'नोंदी सिंक बाकी आहेत',
    gpsSearching: 'जीपीएस शोधत आहे...',
    gpsLocked: 'जीपीएस नोंदवले',
    language: 'भाषा',
    selectLanguage: 'भाषा निवडा',
    categories: {
      'PCB': 'पीसीबी (सर्किट बोर्ड)',
      'CRT': 'सीआरटी (टीव्ही/मॉनिटर ट्यूब)',
      'LCD': 'एलसीडी स्क्रीन',
      'Cable': 'तांब्याची व अ‍ॅल्युमिनियम केबल',
      'Battery': 'बॅटरी (लिथियम/लेड)',
      'Motor/Magnet': 'मोटार व चुंबक',
      'Mixed Plastic': 'मिश्रित ई-कचरा प्लास्टिक'
    },
    speech: {
      valuation: '{weight} किलो {category} चे अंदाजे मूल्य {value} रुपये आहे. चालू बाजार दर {min} ते {max} रुपयांपर्यंत आहे.',
      priceSummary: 'आजचे ई-कचरा भंगाराचे दर प्रति किलो: पीसीबी ४५० रुपये, केबल ३२० रुपये, एलसीडी १८० रुपये, बॅटरी ९५ रुपये, मोटार ९० रुपये, सीआरटी ४५ रुपये आणि प्लास्टिक ३५ रुपये आहे.'
    }
  },
  ta: {
    appTitle: 'கபாடிவாலா கனெக்ட்',
    collectorTitle: 'கபாடிவாலா லைட்',
    dealerTitle: 'வியாபாரி தளம்',
    selectApp: 'பயன்பாட்டைத் தேர்ந்தெடுக்கவும்',
    collectorSubtitle: 'கழிவுகள் சேகரிப்போருக்கான பொருள் கண்டறிதல் மற்றும் உடனடி மதிப்பீடு',
    scannerTab: 'ஸ்கேனர்',
    priceBoardTab: 'விலை நிலவரம்',
    materialGuideTab: 'பாதுகாப்பு வழிகாட்டி',
    homeTab: 'முகப்பு',
    purchaseTab: 'கொள்முதல் பதிவு',
    stockTab: 'கையிருப்பு',
    lotsTab: 'தொகுதிகள்',
    ledgerTab: 'கணக்கு புத்தகம்',
    snapPhoto: 'படம் எடுக்கவும்',
    choosePhoto: 'கேலரியில் தேர்ந்தெடுக்கவும்',
    positionScrap: 'பொருளை சட்டகத்தில் வைக்கவும்',
    mlAssistance: 'ஸ்மார்ட் வழிகாட்டி: கணினி பொருளின் வகையை கணிக்கும். நீங்கள் மாற்றலாம்.',
    quickTestSamples: 'மாதிரி பொருட்கள்',
    detectedCategory: 'கண்டறியப்பட்ட பொருள்',
    confidence: 'நம்பகத்தன்மை',
    confirmCategory: '✓ உறுதி செய்க',
    changeCategory: '✎ வகையை மாற்று',
    manualSelection: 'நேரடியாக தேர்வு செய்க',
    manualDesc: 'பட்டியலில் இருந்து பொருளை தேர்ந்தெடுக்கவும்',
    weightCalculatorTitle: 'உடனடி மதிப்பு கால்குலேட்டர்',
    approxWeight: 'தோராய எடை (கிலோ)',
    enterWeight: 'எடையை உள்ளிடவும்...',
    quickChips: 'விரைவு எடைகள்',
    estimatedValue: 'மதிப்பிடப்பட்ட தொகை',
    marketRange: 'சந்தை வரம்பு',
    listenEstimate: '🔊 குரலில் கேட்க',
    listenAllRates: '🔊 அனைத்து விலைகளையும் கேட்க',
    listenSafety: '🔊 பாதுகாப்பு அறிவுரை கேட்க',
    speaking: 'பேசுகிறது...',
    priceBoardTitle: 'மின்-கழிவு சந்தை நிலவரம்',
    priceBoardSubtitle: 'கிலோவுக்கு தற்போதைய சந்தை விலைகள்',
    prevailingRate: 'தற்போதைய விலை',
    trendRising: 'விலை ஏறியுள்ளது',
    trendFalling: 'விலை குறைந்துள்ளது',
    trendStable: 'நிலையானது',
    safetyWarning: 'பாதுகாப்பு எச்சரிக்கை',
    recyclability: 'மறுசுழற்சி',
    fieldTip: 'பிரிக்கும் குறிப்பு',
    online: 'ஆன்லைன்',
    offline: 'ஆஃப்லைன்',
    syncNow: 'இப்போதே சேமிக்க',
    pendingSync: 'பதிவுகள் காத்திருக்கின்றன',
    gpsSearching: 'ஜிபிஎஸ் தேடுகிறது...',
    gpsLocked: 'ஜிபிஎஸ் பதிவு செய்யப்பட்டது',
    language: 'மொழி',
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    categories: {
      'PCB': 'பிசிபி (மின்னணு பலகை)',
      'CRT': 'சிஆர்டி (பழைய டிவி திரை)',
      'LCD': 'எல்சிடி திரை',
      'Cable': 'தாமிர கம்பி / ஒயர்',
      'Battery': 'பேட்டரி',
      'Motor/Magnet': 'மோட்டார் மற்றும் காந்தம்',
      'Mixed Plastic': 'பிளாஸ்டிக் கழிவு'
    },
    speech: {
      valuation: '{weight} கிலோ {category} பொருளுக்கான மதிப்பிடப்பட்ட விலை {value} ரூபாய். சந்தை வரம்பு {min} முதல் {max} ரூபாய் வரை.',
      priceSummary: 'இன்றைய மின்-கழிவு விலை நிலவரம் கிலோவுக்கு: பிசிபி 450 ரூபாய், கேபிள் 320 ரூபாய், எல்சிடி 180 ரூபாய், பேட்டரி 95 ரூபாய், மோட்டார் 90 ரூபாய், சிஆர்டி 45 ரூபாய், பிளாஸ்டிக் 35 ரூபாய்.'
    }
  },
  te: {
    appTitle: 'కబాడీవాలా కనెక్ట్',
    collectorTitle: 'కబాడీవాలా లైట్',
    dealerTitle: 'డీలర్ యాప్',
    selectApp: 'యాప్‌ను ఎంచుకోండి',
    collectorSubtitle: 'చెత్త సేకరణదారుల కోసం తక్షణ స్క్రాప్ గుర్తింపు మరియు ధర అంచనా',
    scannerTab: 'స్క్రాప్ స్కానర్',
    priceBoardTab: 'ధరల పట్టిక',
    materialGuideTab: 'భద్రతా సూచనలు',
    homeTab: 'హోమ్',
    purchaseTab: 'కొనుగోలు నమోదు',
    stockTab: 'స్టాక్',
    lotsTab: 'లాట్స్',
    ledgerTab: 'ఖాతా పుస్తకం',
    snapPhoto: 'ఫోటో తీయండి',
    choosePhoto: 'గ్యాలరీ నుండి ఎంచుకోండి',
    positionScrap: 'వస్తువును ఫ్రేమ్‌లో ఉంచండి',
    mlAssistance: 'స్మార్ట్ గుర్తింపు: సిస్టమ్ వస్తువు రకాన్ని సూచిస్తుంది. మీరు మార్చవచ్చు.',
    quickTestSamples: 'నమూనా వస్తువులు',
    detectedCategory: 'గుర్తించబడిన వస్తువు',
    confidence: 'ఖచ్చితత్వం',
    confirmCategory: '✓ నిర్ధారించండి',
    changeCategory: '✎ మార్చండి',
    manualSelection: 'నేరుగా ఎంచుకోండి',
    manualDesc: 'జాబితా నుండి సరైన కేటగిరీని ఎంచుకోండి',
    weightCalculatorTitle: 'తక్షణ విలువ కాలిక్యులేటర్',
    approxWeight: 'అంచనా బరువు (కిలోలు)',
    enterWeight: 'బరువు నమోదు చేయండి...',
    quickChips: 'త్వరిత బరువులు',
    estimatedValue: 'అంచనా వేసిన మొత్తం విలువ',
    marketRange: 'మార్కెట్ ధరల పరిధి',
    listenEstimate: '🔊 వాయిస్‌లో వినండి',
    listenAllRates: '🔊 అన్ని ధరలను వినండి',
    listenSafety: '🔊 భద్రతా సమాచారం వినండి',
    speaking: 'చెబుతోంది...',
    priceBoardTitle: 'ఈ-వేస్ట్ మార్కెట్ ధరలు',
    priceBoardSubtitle: 'ప్రస్తుత హోల్‌సేల్ కిలో ధరలు మరియు పోకడలు',
    prevailingRate: 'ప్రస్తుత ధర',
    trendRising: 'ధర పెరిగింది',
    trendFalling: 'ధర తగ్గింది',
    trendStable: 'స్థిరంగా ఉంది',
    safetyWarning: 'ప్రమాద హెచ్చరిక',
    recyclability: 'రీసైక్లింగ్',
    fieldTip: 'సార్టింగ్ చిట్కా',
    online: 'ఆన్‌లైన్',
    offline: 'ఆఫ్‌లైన్ మోడ్',
    syncNow: 'సింక్ చేయండి',
    pendingSync: 'లావాదేవీలు వేచి ఉన్నాయి',
    gpsSearching: 'జిపిఎస్ వెతుకుతోంది...',
    gpsLocked: 'జిపిఎస్ నమోదు చేయబడింది',
    language: 'భాష',
    selectLanguage: 'భాషను ఎంచుకోండి',
    categories: {
      'PCB': 'పిసిబి (సర్క్యూట్ బోర్డ్)',
      'CRT': 'సిఆర్‌టి (పాత టీవీ మానిటర్)',
      'LCD': 'ఎల్‌సిడి స్క్రీన్',
      'Cable': 'రాగి కేబుల్ వైర్లు',
      'Battery': 'బ్యాటరీలు',
      'Motor/Magnet': 'మోటార్ మరియు అయస్కాంతం',
      'Mixed Plastic': 'మిశ్రమ ప్లాస్టిక్'
    },
    speech: {
      valuation: '{weight} కిలోల {category} అంచనా విలువ {value} రూపాయలు. మార్కెట్ రేటు {min} నుండి {max} రూపాయల వరకు ఉంది.',
      priceSummary: 'ఈ రోజు ఈ-వేస్ట్ రేట్లు కిలోకు: పిసిబి 450 రూపాయలు, కేబుల్ 320 రూపాయలు, ఎల్‌సిడి 180 రూపాయలు, బ్యాటరీ 95 రూపాయలు, మోటార్ 90 రూపాయలు, ప్లాస్టిక్ 35 రూపాయలు.'
    }
  },
  kn: {
    appTitle: 'ಕಬಾಡಿವಾಲಾ ಕನೆಕ್ಟ್',
    collectorTitle: 'ಕಬಾಡಿವಾಲಾ ಲೈಟ್',
    dealerTitle: 'ಡೀಲರ್ ಆಪ್',
    selectApp: 'ಆಪ್ ಆಯ್ಕೆಮಾಡಿ',
    collectorSubtitle: 'ಗುಜರಿ ಸಂಗ್ರಾಹಕರಿಗಾಗಿ ತ್ವರಿತ ವಸ್ತು ಗುರುತಿಸುವಿಕೆ ಮತ್ತು ಬೆಲೆ ಅಂದಾಜು',
    scannerTab: 'ಸ್ಕ್ರ್ಯಾಪ್ ಸ್ಕ್ಯಾನರ್',
    priceBoardTab: 'ಬೆಲೆ ಪಟ್ಟಿ',
    materialGuideTab: 'ಸುರಕ್ಷತಾ ಮಾರ್ಗದರ್ಶಿ',
    homeTab: 'ಮುಖಪುಟ',
    purchaseTab: 'ಖರೀದಿ ದಾಖಲು',
    stockTab: 'ದಾಸ್ತಾನು (ಸ್ಟಾಕ್)',
    lotsTab: 'ಲಾಟ್ಗಳು',
    ledgerTab: 'ಖಾತೆ ಪುಸ್ತಕ',
    snapPhoto: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    choosePhoto: 'ಗ್ಯಾಲರಿಯಿಂದ ಆರಿಸಿ',
    positionScrap: 'ವಸ್ತುವನ್ನು ಚೌಕಟ್ಟಿನಲ್ಲಿ ಇರಿಸಿ',
    mlAssistance: 'ಸ್ಮಾರ್ಟ್ ಸಲಹೆ: ವ್ಯವಸ್ಥೆಯು ವಸ್ತುವಿನ ಪ್ರಕಾರವನ್ನು ಸೂಚಿಸುತ್ತದೆ. ನೀವು ಬದಲಾಯಿಸಬಹುದು.',
    quickTestSamples: 'ಮಾದರಿ ವಸ್ತುಗಳು',
    detectedCategory: 'ಗುರುತಿಸಲಾದ ವಸ್ತು',
    confidence: 'ನಿಖರತೆ',
    confirmCategory: '✓ ದೃಢೀಕರಿಸಿ',
    changeCategory: '✎ ಬದಲಾಯಿಸಿ',
    manualSelection: 'ನೇರವಾಗಿ ಆಯ್ಕೆಮಾಡಿ',
    manualDesc: 'ಪಟ್ಟಿಯಿಂದ ವಸ್ತುವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    weightCalculatorTitle: 'ತ್ವರಿತ ಬೆಲೆ ಲೆಕ್ಕಾಚಾರ',
    approxWeight: 'ಅಂದಾಜು ತೂಕ (ಕೆಜಿ)',
    enterWeight: 'ತೂಕ ನಮೂದಿಸಿ...',
    quickChips: 'ತ್ವರಿತ ತೂಕಗಳು',
    estimatedValue: 'ಅಂದಾಜು ಒಟ್ಟು ಮೌಲ್ಯ',
    marketRange: 'ಮಾರುಕಟ್ಟೆ ಶ್ರೇಣಿ',
    listenEstimate: '🔊 ಧ್ವನಿಯಲ್ಲಿ ಕೇಳಿ',
    listenAllRates: '🔊 ಎಲ್ಲಾ ಬೆಲೆಗಳನ್ನು ಕೇಳಿ',
    listenSafety: '🔊 ಸುರಕ್ಷತಾ ಮಾಹಿತಿ ಕೇಳಿ',
    speaking: 'ಮಾತನಾಡುತ್ತಿದೆ...',
    priceBoardTitle: 'ಇ-ತ್ಯಾಜ್ಯ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು',
    priceBoardSubtitle: 'ಪ್ರಸ್ತುತ ಸಗಟು ಕೆಜಿ ಬೆಲೆಗಳು ಮತ್ತು ಪ್ರವೃತ್ತಿಗಳು',
    prevailingRate: 'ಪ್ರಸ್ತುತ ದರ',
    trendRising: 'ಏರಿಕೆಯಾಗಿದೆ',
    trendFalling: 'ಇಳಿಕೆಯಾಗಿದೆ',
    trendStable: 'ಸ್ಥಿರವಾಗಿದೆ',
    safetyWarning: 'ಅಪಾಯ ಎಚ್ಚರಿಕೆ',
    recyclability: 'ಮರುಬಳಕೆ',
    fieldTip: 'ವಿಂಗಡಣೆ ಸಲಹೆ',
    online: 'ಆನ್‌ಲೈನ್',
    offline: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್',
    syncNow: 'ಸಿಂಕ್ ಮಾಡಿ',
    pendingSync: 'ದಾಖಲೆಗಳು ಕಾಯುತ್ತಿವೆ',
    gpsSearching: 'ಜಿಪಿಎಸ್ ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    gpsLocked: 'ಜಿಪಿಎಸ್ ದಾಖಲಾಗಿದೆ',
    language: 'ಭಾಷೆ',
    selectLanguage: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    categories: {
      'PCB': 'ಪಿಸಿಬಿ (ಸರ್ಕ್ಯೂಟ್ ಬೋರ್ಡ್)',
      'CRT': 'ಸಿಆರ್‌ಟಿ (ಹಳೆಯ ಟಿವಿ ಮಾನಿಟರ್)',
      'LCD': 'ಎಲ್ಸಿಡಿ ಪರದೆ',
      'Cable': 'ತಾಮ್ರದ ಕೇಬಲ್ ತಂತಿಗಳು',
      'Battery': 'ಬ್ಯಾಟರಿಗಳು',
      'Motor/Magnet': 'ಮೋಟಾರ್ ಮತ್ತು ಮ್ಯಾಗ್ನೆಟ್',
      'Mixed Plastic': 'ಮಿಶ್ರ ಪ್ಲಾಸ್ಟಿಕ್'
    },
    speech: {
      valuation: '{weight} ಕೆಜಿ {category} ಅಂದಾಜು ಮೌಲ್ಯ {value} ರೂಪಾಯಿಗಳು. ಮಾರುಕಟ್ಟೆ ದರ {min} ರಿಂದ {max} ರೂಪಾಯಿಗಳವರೆಗೆ ಇದೆ.',
      priceSummary: 'ಇಂದಿನ ಇ-ತ್ಯಾಜ್ಯ ಬೆಲೆಗಳು ಪ್ರತಿ ಕೆಜಿಗೆ: ಪಿಸಿಬಿ 450 ರೂಪಾಯಿ, ಕೇಬಲ್ 320 ರೂಪಾಯಿ, ಎಲ್ಸಿಡಿ 180 ರೂಪಾಯಿ, ಬ್ಯಾಟರಿ 95 ರೂಪಾಯಿ, ಮೋಟಾರ್ 90 ರೂಪಾಯಿ, ಸಿಆರ್‌ಟಿ 45 ರೂಪಾಯಿ, ಪ್ಲಾಸ್ಟಿಕ್ 35 ರೂಪಾಯಿ.'
    }
  },
  ml: {
    appTitle: 'കബഡിവാല കണക്ട്',
    collectorTitle: 'കബഡിവാല ലൈറ്റ്',
    dealerTitle: 'ഡീലർ ആപ്പ്',
    selectApp: 'ആപ്പ് തിരഞ്ഞെടുക്കുക',
    collectorSubtitle: 'ആക്രി ശേഖരിക്കുന്നവർക്കായി തത്സമയ തിരിച്ചറിയലും വില കണക്കാക്കലും',
    scannerTab: 'സ്ക്രാപ്പ് സ്കാനർ',
    priceBoardTab: 'വിലനിലവാരം',
    materialGuideTab: 'സുരക്ഷാ ഗൈഡ്',
    homeTab: 'ഹോം',
    purchaseTab: 'വാങ്ങൽ രേഖപ്പെടുത്തുക',
    stockTab: 'സ്റ്റോക്ക്',
    lotsTab: 'ലോട്ടുകൾ',
    ledgerTab: 'കണക്കുപുസ്തകം',
    snapPhoto: 'ഫോട്ടോ എടുക്കുക',
    choosePhoto: 'ഗ്യാലറിയിൽ നിന്ന് എടുക്കുക',
    positionScrap: 'വസ്തു ഫ്രെയിമിനുള്ളിൽ വയ്ക്കുക',
    mlAssistance: 'സ്മാർട്ട് നിർദ്ദേശം: സിസ്റ്റം വസ്തുകണ്ടുപിടിക്കും. ആവശ്യമെങ്കിൽ മാറ്റാം.',
    quickTestSamples: 'സാമ്പിൾ വസ്തുക്കൾ',
    detectedCategory: 'തിരിച്ചറിഞ്ഞ വസ്തു',
    confidence: 'കൃത്യത',
    confirmCategory: '✓ ഉറപ്പാക്കുക',
    changeCategory: '✎ മാറ്റുക',
    manualSelection: 'നേരിട്ട് തിരഞ്ഞെടുക്കുക',
    manualDesc: 'ലിസ്റ്റിൽ നിന്ന് ശരിയായ വിഭാഗം തിരഞ്ഞെടുക്കുക',
    weightCalculatorTitle: 'തത്സമയ വില കാൽക്കുലേറ്റർ',
    approxWeight: 'ഏകദേശ ഭാരം (കിലോ)',
    enterWeight: 'ഭാരം രേഖപ്പെടുത്തുക...',
    quickChips: 'പെട്ടെന്നുള്ള ഭാരങ്ങൾ',
    estimatedValue: 'കണക്കാക്കിയ മൊത്തം വില',
    marketRange: 'വിപണി നിരക്ക് പരിധി',
    listenEstimate: '🔊 ശബ്ദത്തിൽ കേൾക്കുക',
    listenAllRates: '🔊 എല്ലാ നിരക്കുകളും കേൾക്കുക',
    listenSafety: '🔊 സുരക്ഷാ നിർദ്ദേശം കേൾക്കുക',
    speaking: 'സംസാരിക്കുന്നു...',
    priceBoardTitle: 'ഇ-മാലിന്യ വിപണി വിലനിലവാരം',
    priceBoardSubtitle: 'കിലോഗ്രാമിന് നിലവിലെ മൊത്തവിലയും ട്രെൻഡുകളും',
    prevailingRate: 'നിലവിലെ നിരക്ക്',
    trendRising: 'വില കൂടി',
    trendFalling: 'വില കുറഞ്ഞു',
    trendStable: 'സ്ഥിരതയുള്ളത്',
    safetyWarning: 'അപകട മുന്നറിയിപ്പ്',
    recyclability: 'റീസൈക്ലിംഗ്',
    fieldTip: 'തരംതിരിക്കൽ സൂചന',
    online: 'ഓൺലൈൻ',
    offline: 'ഓഫ്‌ലൈൻ മോഡ്',
    syncNow: 'സിങ്ക് ചെയ്യുക',
    pendingSync: 'ഇനങ്ങൾ കാത്തിരിക്കുന്നു',
    gpsSearching: 'ജിപിഎസ് തിരയുന്നു...',
    gpsLocked: 'ജിപിഎസ് രേഖപ്പെടുത്തി',
    language: 'ഭാഷ',
    selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    categories: {
      'PCB': 'പിസിബി (സർക്യൂട്ട് ബോർഡ്)',
      'CRT': 'സിആർടി (പഴയ ടിവി സ്ക്രീൻ)',
      'LCD': 'എൽസിഡി പാനലുകൾ',
      'Cable': 'കോപ്പർ കേബിളുകൾ',
      'Battery': 'ബാറ്ററികൾ',
      'Motor/Magnet': 'മോട്ടോറുകളും കാന്തങ്ങളും',
      'Mixed Plastic': 'പ്ലാസ്റ്റിക് മാലിന്യങ്ങൾ'
    },
    speech: {
      valuation: '{weight} കിലോഗ്രാം {category} ന് ഏകദേശം {value} രൂപ ലഭിക്കും. മാർക്കറ്റ് നിരക്ക് {min} മുതൽ {max} രൂപ വരെയാണ്.',
      priceSummary: 'ഇന്നത്തെ ഇ-മാലിന്യ വിലകൾ ഒരു കിലോയ്ക്ക്: പിസിബി 450 രൂപ, കേബിൾ 320 രൂപ, എൽസിഡി 180 രൂപ, ബാറ്ററി 95 രൂപ, മോട്ടോർ 90 രൂപ, സിആർടി 45 രൂപ, പ്ലാസ്റ്റിക് 35 രൂപ.'
    }
  },
  bn: {
    appTitle: 'কাবাডিওয়ালা কানেক্ট',
    collectorTitle: 'কাবাডিওয়ালা লাইট',
    dealerTitle: 'ডিলার অ্যাপ',
    selectApp: 'অ্যাপ বেছে নিন',
    collectorSubtitle: 'ভাঙারি সংগ্রাহকদের জন্য তাত্ক্ষণিক জিনিস শনাক্তকরণ এবং দাম অনুমান',
    scannerTab: 'স্ক্র্যাপ স্ক্যানার',
    priceBoardTab: 'বাজার দর (রেট)',
    materialGuideTab: 'নিরাপত্তা নির্দেশিকা',
    homeTab: 'হোম',
    purchaseTab: 'ক্রয় তালিকাভুক্ত করুন',
    stockTab: 'মজুদ (স্টক)',
    lotsTab: 'লট',
    ledgerTab: 'হিসাব খাতা',
    snapPhoto: 'ছবি তুলুন',
    choosePhoto: 'গ্যালারি থেকে নিন',
    positionScrap: 'জিনিসটি ফ্রেমের ভেতর রাখুন',
    mlAssistance: 'স্মার্ট পরামর্শ: সিস্টেম স্ক্র্যাপের ধরন অনুমান করবে। আপনি পরিবর্তন করতে পারেন।',
    quickTestSamples: 'নমুনা স্ক্র্যাপ (পরীক্ষা)',
    detectedCategory: 'শনাক্তকৃত স্ক্র্যাপ',
    confidence: 'সঠিকতা',
    confirmCategory: '✓ নিশ্চিত করুন',
    changeCategory: '✎ পরিবর্তন করুন',
    manualSelection: 'তালিকা থেকে বেছে নিন',
    manualDesc: 'সন্দেহ থাকলে তালিকা থেকে সরাসরি নির্বাচন করুন',
    weightCalculatorTitle: 'তাত্ক্ষণিক দাম ক্যালকুলেটর',
    approxWeight: 'আনুমানিক ওজন (কেজি)',
    enterWeight: 'ওজন লিখুন...',
    quickChips: 'দ্রুত ওজন',
    estimatedValue: 'আনুমানিক মোট দাম',
    marketRange: 'বাজার দর পরিসীমা',
    listenEstimate: '🔊 শুনে নিন (শব্দে)',
    listenAllRates: '🔊 সব রেট শুনুন',
    listenSafety: '🔊 নিরাপত্তা তথ্য শুনুন',
    speaking: 'বলছি...',
    priceBoardTitle: 'ই-বর্জ্য বাজার দর এবং ট্রেন্ড',
    priceBoardSubtitle: 'প্রতি কেজিতে বর্তমান পাইকারি দর এবং ৩০ দিনের পরিবর্তন',
    prevailingRate: 'বর্তমান রেট',
    trendRising: 'বাড়ছে',
    trendFalling: 'কমছে',
    trendStable: 'স্থিতিশীল',
    safetyWarning: 'বিপদ সতর্কতা',
    recyclability: 'রিসাইকেল योग्यता',
    fieldTip: 'বাছাইয়ের পরামর্শ',
    online: 'অনলাইন',
    offline: 'অফলাইন মোড',
    syncNow: 'এখনই সিঙ্ক করুন',
    pendingSync: 'লেনদেন সিঙ্ক বাকি আছে',
    gpsSearching: 'জিপিএস খোঁজা হচ্ছে...',
    gpsLocked: 'জিপিএস যুক্ত হয়েছে',
    language: 'ভাষা',
    selectLanguage: 'আপনার ভাষা বেছে নিন',
    categories: {
      'PCB': 'পিসিবি (সার্কিট বোর্ড)',
      'CRT': 'সিআরটি (পুরোনো টিভি স্ক্রিন)',
      'LCD': 'এলসিডি ডিসপ্লে',
      'Cable': 'তামার তার ও কেব্‌ল',
      'Battery': 'ব্যাটারি (লিথিয়াম/লেড)',
      'Motor/Magnet': 'মোটর এবং চুম্বক',
      'Mixed Plastic': 'মিশ্র ই-বর্জ্য প্লাস্টিক'
    },
    speech: {
      valuation: '{weight} কেজি {category}-র আনুমানিক দাম {value} টাকা। বাজারে বর্তমান রেট {min} থেকে {max} টাকার মধ্যে।',
      priceSummary: 'আজকের ই-বর্জ্য স্ক্র্যাপের পাইকারি রেট প্রতি কেজি: পিসিবি ৪৫০ টাকা, তার ৩২০ টাকা, এলসিডি ১৮০ টাকা, ব্যাটারি ৯৫ টাকা, মোটর ৯০ টাকা, সিআরটি ৪৫ টাকা এবং প্লাস্টিক ৩৫ টাকা।'
    }
  }
};

class I18nEngine {
  constructor() {
    this.currentLang = localStorage.getItem('kw_preferred_language') || 'en';
    if (!TRANSLATIONS[this.currentLang]) {
      this.currentLang = 'en';
    }
    this.listeners = [];
  }

  getLang() {
    return this.currentLang;
  }

  setLang(langCode) {
    if (!TRANSLATIONS[langCode]) return;
    this.currentLang = langCode;
    localStorage.setItem('kw_preferred_language', langCode);
    this.listeners.forEach(fn => fn(langCode));
  }

  onLanguageChange(callback) {
    this.listeners.push(callback);
  }

  t(key, params = {}) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    let text = key.split('.').reduce((acc, part) => acc && acc[part], dict);
    if (!text) {
      text = key.split('.').reduce((acc, part) => acc && acc[part], TRANSLATIONS.en) || key;
    }
    if (typeof text === 'string') {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return text;
  }

  getCategoryName(catId) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    return dict.categories?.[catId] || TRANSLATIONS.en.categories?.[catId] || catId;
  }

  /**
   * Zero-API-Key Web Speech API Synthesizer
   */
  speak(text, options = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API not supported in this browser.');
      return false;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any active speech

      // Hindi TTS preprocessor: the Windows Hindi voice mispronounces 'है' as 'ho'.
      // We globally replace 'है' → 'हैं' when followed by punctuation/space/end-of-string.
      // This fixes the bug for ALL Hindi text in one place without touching individual strings.
      let processedText = text;
      if (this.currentLang === 'hi') {
        processedText = text.replace(/है(?=[\s।?,.!]|$)/g, 'हैं');
      }

      const utterance = new SpeechSynthesisUtterance(processedText);
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === this.currentLang) || SUPPORTED_LANGUAGES[0];

      utterance.lang = langConfig.voiceLang || 'en-IN';
      utterance.rate = options.rate || 0.92;
      utterance.pitch = options.pitch || 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langPrefix = utterance.lang.split('-')[0].toLowerCase();
        
        // Priority 1: Google cloud voices (highest quality, bug-free for Indian languages)
        const googleVoice = voices.find(v => 
          (v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase().includes(langPrefix)) && 
          v.name.toLowerCase().includes('google')
        );
        
        // Priority 2: Any native fallback
        const matchedVoice = voices.find(v => 
          v.lang.toLowerCase().startsWith(langPrefix) || 
          v.lang.toLowerCase().includes(langPrefix)
        );
        
        if (googleVoice) {
          utterance.voice = googleVoice;
        } else if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      if (options.onStart) utterance.onstart = options.onStart;
      if (options.onEnd) utterance.onend = options.onEnd;
      if (options.onError) utterance.onerror = options.onError;

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error('Speech synthesis failed:', err);
      return false;
    }
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  renderLanguagePickerButton() {
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === this.currentLang) || SUPPORTED_LANGUAGES[0];
    return `
      <button class="lang-picker-btn" id="kwLangPickerBtn" title="Change Language / भाषा बदलें">
        <span class="lang-flag">${langConfig.flag}</span>
        <span class="lang-code">${langConfig.nativeName}</span>
        <span class="lang-arrow">▾</span>
      </button>
    `;
  }

  openLanguageModal() {
    let modal = document.getElementById('kwLanguageModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'kwLanguageModal';
    modal.className = 'lang-modal-backdrop';
    modal.innerHTML = `
      <div class="lang-modal-card">
        <div class="lang-modal-header">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #f8fafc;">${this.t('selectLanguage')}</h3>
            <p style="font-size: 0.78rem; color: #94a3b8;">Select your preferred language for text & voice</p>
          </div>
          <button class="btn btn-sm btn-outline" id="kwCloseLangModal">✕</button>
        </div>

        <div class="lang-grid">
          ${SUPPORTED_LANGUAGES.map(l => `
            <button class="lang-option-card ${l.code === this.currentLang ? 'active' : ''}" data-lang="${l.code}">
              <div class="lang-option-flag">${l.flag}</div>
              <div class="lang-option-text">
                <div class="lang-option-native">${l.nativeName}</div>
                <div class="lang-option-en">${l.name}</div>
              </div>
              ${l.code === this.currentLang ? '<span class="lang-check">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#kwCloseLangModal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll('.lang-option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-lang');
        this.setLang(selected);
        modal.remove();
      });
    });
  }
}

export const i18n = new I18nEngine();
