import { getCachedData, setCachedData, getCacheStatus, setCacheStatus, CACHE_KEYS } from './redis';
import { dbHelpers, runTransaction, initializeDatabase } from './database';
import { createBackgroundService } from './backgroundService';

interface CachedStockData {
  ticker: string;
  preMarketPrice: number;
  closePrice: number;
  percentChange: number;
  marketCapDiff: number;
  currentMarketCap: number;
  lastUpdated: Date;
}

class StockDataCache {
  private cache: Map<string, CachedStockData> = new Map();
  private isUpdating = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private cacheStatus: { count: number; lastUpdated: Date | null; isUpdating: boolean; successCount: number; errorCount: number } | null = null;

  // Full list of 300+ major companies
  private readonly TICKERS = [
    'NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'BRK.B', 'JPM',
    'LLY', 'V', 'WMT', 'XOM', 'UNH', 'JNJ', 'PG', 'HD', 'MA', 'CVX',
    'ORCL', 'NFLX', 'COST', 'ABBV', 'BAC', 'KO', 'AMD', 'GE', 'CSCO', 'TMUS',
    'WFC', 'CRM', 'PM', 'IBM', 'MS', 'GS', 'INTU', 'LIN', 'ABT', 'AXP',
    'BX', 'DIS', 'MCD', 'RTX', 'NOW', 'MRK', 'CAT', 'T', 'PEP', 'UBER',
    'BKNG', 'TMO', 'VZ', 'SCHW', 'ISRG', 'QCOM', 'C', 'TXN', 'BA', 'BLK',
    'ACN', 'SPGI', 'AMGN', 'ADBE', 'BSX', 'SYK', 'ETN', 'AMAT', 'ANET', 'NEE',
    'DHR', 'HON', 'TJX', 'PGR', 'GILD', 'DE', 'PFE', 'COF', 'KKR', 'PANW',
    'UNP', 'APH', 'LOW', 'LRCX', 'MU', 'ADP', 'CMCSA', 'COP', 'KLAC', 'VRTX',
    'MDT', 'SNPS', 'NKE', 'CRWD', 'ADI', 'WELL', 'CB', 'ICE', 'SBUX', 'TT',
    'SO', 'CEG', 'PLD', 'DASH', 'AMT', 'MO', 'MMC', 'CME', 'CDNS', 'LMT',
    'BMY', 'WM', 'PH', 'COIN', 'DUK', 'RCL', 'MCO', 'MDLZ', 'DELL', 'TDG',
    'CTAS', 'INTC', 'MCK', 'ABNB', 'GD', 'ORLY', 'APO', 'SHW', 'HCA', 'EMR',
    'NOC', 'MMM', 'FTNT', 'EQIX', 'CI', 'UPS', 'FI', 'HWM', 'AON', 'PNC',
    'CVS', 'RSG', 'AJG', 'ITW', 'MAR', 'ECL', 'MSI', 'USB', 'WMB', 'BK',
    'CL', 'NEM', 'PYPL', 'JCI', 'ZTS', 'VST', 'EOG', 'CSX', 'ELV', 'ADSK',
    'APD', 'AZO', 'HLT', 'WDAY', 'SPG', 'NSC', 'KMI', 'TEL', 'FCX', 'CARR',
    'PWR', 'REGN', 'ROP', 'CMG', 'DLR', 'MNST', 'TFC', 'TRV', 'AEP', 'NXPI',
    'AXON', 'URI', 'COR', 'FDX', 'NDAQ', 'AFL', 'GLW', 'FAST', 'MPC', 'SLB',
    'SRE', 'PAYX', 'PCAR', 'MET', 'BDX', 'OKE', 'DDOG',
    'MSCI', 'WST', 'IDXX', 'FICO', 'TER', 'CTLT', 'CHD', 'ILMN', 'PAYC', 'CSGP', 'MKTX', 'BKR', 'FSLR', 'ENPH', 'GNRC', 'BALL', 'RMD', 'TDY', 'STZ', 'MLM', 'VRSK', 'WAB', 'ATO', 'SNA', 'BRO', 'ROK', 'KEYS', 'PTC', 'INVH', 'AVB', 'ESS', 'PEAK', 'MAA', 'CPT', 'HES', 'CF', 'MOS', 'NTRS', 'ZBRA', 'LHX', 'BAX', 'CAH', 'HOLX',
    'TSM', 'SAP', 'ASML', 'BABA', 'TM', 'AZN', 'HSBC', 'NVS', 'SHEL', 'HDB',
    'RY', 'NVO', 'ARM', 'SHOP', 'MUFG', 'PDD', 'UL', 'SONY', 'TTE', 'BHP',
    'SAN', 'TD', 'SPOT', 'UBS', 'IBN', 'SNY', 'BUD', 'BTI', 'BN', 'SMFG',
    'ENB', 'RELX', 'TRI', 'RACE', 'BBVA', 'SE', 'BP', 'NTES', 'BMO', 'RIO',
    'GSK', 'MFG', 'INFY', 'CP', 'BCS', 'NGG', 'BNS', 'ING', 'EQNR', 'CM',
    'CNQ', 'LYG', 'AEM', 'DB', 'NU', 'CNI', 'DEO', 'NWG', 'AMX', 'MFC',
    'E', 'WCN', 'SU', 'TRP', 'PBR', 'HMC', 'GRMN', 'CCEP', 'ALC', 'TAK',
    'SNOW', 'ZM', 'ROKU', 'SQ', 'TWLO', 'OKTA', 'DOCU', 'TEAM', 'MELI', 'JD',
    'BIDU', 'NIO', 'XPEV', 'LI', 'XP', 'TME', 'BILI', 'DIDI', 'FOX',
    'FOXA', 'PARA', 'WBD', 'SNAP', 'PINS', 'TWTR', 'GOOG', 'EBAY', 'ETSY',
    'TGT', 'F', 'GM', 'TM', 'RIVN', 'LCID', 'WDC', 'STX', 'MCHP', 'ON',
    'STM', 'NXP', 'ZS', 'NET', 'PLTR', 'MDB', 'ESTC', 'SPLK', 'DT', 'PATH',
    'U', 'RBLX', 'TTD', 'TTWO', 'EA', 'ATVI', 'ZNGA', 'MTCH', 'BMBL', 'LYFT',
    'GRAB'
  ];

  // Company names mapping
  private readonly companyNames: Record<string, string> = {
    'NVDA': 'NVIDIA', 'MSFT': 'Microsoft', 'AAPL': 'Apple', 'AMZN': 'Amazon', 'GOOGL': 'Alphabet', 'GOOG': 'Alphabet',
    'META': 'Meta Platforms', 'AVGO': 'Broadcom', 'BRK.A': 'Berkshire Hathaway', 'BRK.B': 'Berkshire Hathaway', 'TSLA': 'Tesla',
    'JPM': 'JPMorgan Chase', 'WMT': 'Walmart', 'LLY': 'Eli Lilly', 'ORCL': 'Oracle', 'V': 'Visa', 'MA': 'Mastercard',
    'NFLX': 'Netflix', 'XOM': 'Exxon Mobil', 'COST': 'Costco', 'JNJ': 'Johnson & Johnson', 'HD': 'Home Depot', 'PLTR': 'Palantir',
    'PG': 'Procter & Gamble', 'BAC': 'Bank of America', 'ABBV': 'AbbVie', 'CVX': 'Chevron', 'KO': 'Coca-Cola', 'AMD': 'Advanced Micro Devices',
    'GE': 'General Electric', 'CSCO': 'Cisco Systems', 'TMUS': 'T-Mobile US', 'WFC': 'Wells Fargo', 'CRM': 'Salesforce', 'PM': 'Philip Morris',
    'IBM': 'IBM', 'UNH': 'UnitedHealth Group', 'MS': 'Morgan Stanley', 'GS': 'Goldman Sachs', 'INTU': 'Intuit', 'LIN': 'Linde',
    'ABT': 'Abbott Laboratories', 'AXP': 'American Express', 'BX': 'Blackstone', 'DIS': 'Walt Disney', 'MCD': 'McDonald\'s', 'RTX': 'Raytheon Technologies',
    'NOW': 'ServiceNow', 'MRK': 'Merck', 'CAT': 'Caterpillar', 'T': 'AT&T', 'PEP': 'PepsiCo', 'UBER': 'Uber Technologies',
    'BKNG': 'Booking Holdings', 'TMO': 'Thermo Fisher Scientific', 'VZ': 'Verizon', 'SCHW': 'Charles Schwab', 'ISRG': 'Intuitive Surgical', 'QCOM': 'Qualcomm',
    'C': 'Citigroup', 'TXN': 'Texas Instruments', 'BA': 'Boeing', 'BLK': 'BlackRock', 'ACN': 'Accenture', 'SPGI': 'S&P Global',
    'AMGN': 'Amgen', 'ADBE': 'Adobe', 'BSX': 'Boston Scientific', 'SYK': 'Stryker', 'ETN': 'Eaton', 'AMAT': 'Applied Materials',
    'ANET': 'Arista Networks', 'NEE': 'NextEra Energy', 'DHR': 'Danaher', 'HON': 'Honeywell', 'TJX': 'TJX Companies', 'PGR': 'Progressive',
    'GILD': 'Gilead Sciences', 'DE': 'Deere & Company', 'PFE': 'Pfizer', 'COF': 'Capital One', 'KKR': 'KKR & Co', 'PANW': 'Palo Alto Networks',
    'UNP': 'Union Pacific', 'APH': 'Amphenol', 'LOW': 'Lowe\'s', 'LRCX': 'Lam Research', 'MU': 'Micron Technology', 'ADP': 'Automatic Data Processing',
    'CMCSA': 'Comcast', 'COP': 'ConocoPhillips', 'KLAC': 'KLA Corporation', 'VRTX': 'Vertex Pharmaceuticals', 'MDT': 'Medtronic', 'SNPS': 'Synopsys',
    'NKE': 'Nike', 'CRWD': 'CrowdStrike', 'ADI': 'Analog Devices', 'WELL': 'Welltower', 'CB': 'Chubb', 'ICE': 'Intercontinental Exchange',
    'SBUX': 'Starbucks', 'TT': 'Trane Technologies', 'SO': 'Southern Company', 'CEG': 'Constellation Energy', 'PLD': 'Prologis', 'DASH': 'DoorDash',
    'AMT': 'American Tower', 'MO': 'Altria Group', 'MMC': 'Marsh & McLennan', 'CME': 'CME Group', 'CDNS': 'Cadence Design Systems', 'LMT': 'Lockheed Martin',
    'BMY': 'Bristol-Myers Squibb', 'WM': 'Waste Management', 'PH': 'Parker-Hannifin', 'COIN': 'Coinbase Global', 'DUK': 'Duke Energy', 'RCL': 'Royal Caribbean',
    'MCO': 'Moody\'s', 'MDLZ': 'Mondelez International', 'DELL': 'Dell Technologies', 'TDG': 'TransDigm Group', 'CTAS': 'Cintas', 'INTC': 'Intel',
    'MCK': 'McKesson', 'ABNB': 'Airbnb', 'GD': 'General Dynamics', 'ORLY': 'O\'Reilly Automotive', 'APO': 'Apollo Global Management', 'SHW': 'Sherwin-Williams',
    'HCA': 'HCA Healthcare', 'EMR': 'Emerson Electric', 'NOC': 'Northrop Grumman', 'MMM': '3M', 'FTNT': 'Fortinet', 'EQIX': 'Equinix',
    'CI': 'Cigna', 'UPS': 'United Parcel Service', 'FI': 'Fiserv', 'HWM': 'Howmet Aerospace', 'AON': 'Aon', 'PNC': 'PNC Financial Services',
    'CVS': 'CVS Health', 'RSG': 'Republic Services', 'AJG': 'Arthur J. Gallagher', 'ITW': 'Illinois Tool Works', 'MAR': 'Marriott International', 'ECL': 'Ecolab',
    'MSI': 'Motorola Solutions', 'USB': 'U.S. Bancorp', 'WMB': 'Williams Companies', 'BK': 'Bank of New York Mellon', 'CL': 'Colgate-Palmolive', 'NEM': 'Newmont',
    'PYPL': 'PayPal', 'JCI': 'Johnson Controls', 'ZTS': 'Zoetis', 'VST': 'Vistra', 'EOG': 'EOG Resources', 'CSX': 'CSX',
    'ELV': 'Elevance Health', 'ADSK': 'Autodesk', 'APD': 'Air Products and Chemicals', 'AZO': 'AutoZone', 'HLT': 'Hilton Worldwide', 'WDAY': 'Workday',
    'SPG': 'Simon Property Group', 'NSC': 'Norfolk Southern', 'KMI': 'Kinder Morgan', 'TEL': 'TE Connectivity', 'FCX': 'Freeport-McMoRan', 'CARR': 'Carrier Global',
    'PWR': 'Quanta Services', 'REGN': 'Regeneron Pharmaceuticals', 'ROP': 'Roper Technologies', 'CMG': 'Chipotle Mexican Grill', 'DLR': 'Digital Realty Trust', 'MNST': 'Monster Beverage',
    'TFC': 'Truist Financial', 'TRV': 'Travelers Companies', 'AEP': 'American Electric Power', 'NXPI': 'NXP Semiconductors', 'AXON': 'Axon Enterprise', 'URI': 'United Rentals',
    'COR': 'Cencora', 'FDX': 'FedEx', 'NDAQ': 'Nasdaq', 'AFL': 'Aflac', 'GLW': 'Corning', 'FAST': 'Fastenal',
    'MPC': 'Marathon Petroleum', 'SLB': 'Schlumberger', 'SRE': 'Sempra Energy', 'PAYX': 'Paychex', 'PCAR': 'PACCAR', 'MET': 'MetLife',
    'BDX': 'Becton Dickinson', 'OKE': 'ONEOK', 'DDOG': 'Datadog',
    // International companies
    'TSM': 'Taiwan Semiconductor', 'SAP': 'SAP SE', 'ASML': 'ASML Holding', 'BABA': 'Alibaba Group', 'TM': 'Toyota Motor', 'AZN': 'AstraZeneca',
    'HSBC': 'HSBC Holdings', 'NVS': 'Novartis', 'SHEL': 'Shell', 'HDB': 'HDFC Bank', 'RY': 'Royal Bank of Canada', 'NVO': 'Novo Nordisk',
    'ARM': 'ARM Holdings', 'SHOP': 'Shopify', 'MUFG': 'Mitsubishi UFJ Financial', 'PDD': 'Pinduoduo', 'UL': 'Unilever', 'SONY': 'Sony Group',
    'TTE': 'TotalEnergies', 'BHP': 'BHP Group', 'SAN': 'Banco Santander', 'TD': 'Toronto-Dominion Bank', 'SPOT': 'Spotify Technology', 'UBS': 'UBS Group',
    'IBN': 'ICICI Bank', 'SNY': 'Sanofi', 'BUD': 'Anheuser-Busch InBev', 'BTI': 'British American Tobacco', 'BN': 'Danone', 'SMFG': 'Sumitomo Mitsui Financial',
    'ENB': 'Enbridge', 'RELX': 'RELX Group', 'TRI': 'Thomson Reuters', 'RACE': 'Ferrari', 'BBVA': 'Banco Bilbao Vizcaya', 'SE': 'Sea Limited',
    'BP': 'BP', 'NTES': 'NetEase', 'BMO': 'Bank of Montreal', 'RIO': 'Rio Tinto', 'GSK': 'GlaxoSmithKline', 'MFG': 'Mizuho Financial',
    'INFY': 'Infosys', 'CP': 'Canadian Pacific Railway', 'BCS': 'Barclays', 'NGG': 'National Grid', 'BNS': 'Bank of Nova Scotia', 'ING': 'ING Group',
    'EQNR': 'Equinor', 'CM': 'Canadian Imperial Bank', 'CNQ': 'Canadian Natural Resources', 'LYG': 'Lloyds Banking Group', 'AEM': 'Agnico Eagle Mines', 'DB': 'Deutsche Bank',
    'NU': 'Nu Holdings', 'CNI': 'Canadian National Railway', 'DEO': 'Diageo', 'NWG': 'NatWest Group', 'AMX': 'America Movil', 'MFC': 'Manulife Financial',
    'E': 'Eni', 'WCN': 'Waste Connections', 'SU': 'Suncor Energy', 'TRP': 'TC Energy', 'PBR': 'Petrobras', 'HMC': 'Honda Motor',
    'GRMN': 'Garmin', 'CCEP': 'Coca-Cola Europacific Partners', 'ALC': 'Alcon', 'TAK': 'Takeda Pharmaceutical',
    // Additional companies that were missing
    'BIDU': 'Baidu', 'STX': 'Seagate Technology', 'WBD': 'Warner Bros. Discovery', 'TME': 'Tencent Music Entertainment', 'EBAY': 'eBay',
    // New companies
    'MSCI': 'MSCI Inc', 'WST': 'West Pharmaceutical Services', 'IDXX': 'IDEXX Laboratories', 'FICO': 'Fair Isaac Corporation', 'TER': 'Teradyne', 'CTLT': 'Catalent', 'CHD': 'Church & Dwight', 'ILMN': 'Illumina', 'PAYC': 'Paycom Software', 'CSGP': 'CoStar Group', 'MKTX': 'MarketAxess Holdings', 'BKR': 'Baker Hughes', 'FSLR': 'First Solar', 'ENPH': 'Enphase Energy', 'GNRC': 'Generac Holdings', 'BALL': 'Ball Corporation', 'RMD': 'ResMed', 'TDY': 'Teledyne Technologies', 'STZ': 'Constellation Brands', 'MLM': 'Martin Marietta Materials', 'VRSK': 'Verisk Analytics', 'WAB': 'Wabtec Corporation', 'ATO': 'Atmos Energy', 'SNA': 'Snap-on', 'BRO': 'Brown & Brown', 'ROK': 'Rockwell Automation', 'KEYS': 'Keysight Technologies', 'PTC': 'PTC Inc', 'INVH': 'Invitation Homes', 'AVB': 'AvalonBay Communities', 'ESS': 'Essex Property Trust', 'PEAK': 'Healthpeak Properties', 'MAA': 'Mid-America Apartment Communities', 'CPT': 'Camden Property Trust', 'HES': 'Hess Corporation', 'CF': 'CF Industries Holdings', 'MOS': 'Mosaic Company', 'NTRS': 'Northern Trust', 'ZBRA': 'Zebra Technologies', 'LHX': 'L3Harris Technologies', 'BAX': 'Baxter International', 'CAH': 'Cardinal Health', 'HOLX': 'Hologic'
  };

  // Share counts for market cap calculation
  private readonly shareCounts: Record<string, number> = {
    'NVDA': 2460000000, 'MSFT': 7460000000, 'AAPL': 15400000000, 'AMZN': 10600000000, 'GOOGL': 12600000000, 'GOOG': 12600000000,
    'META': 2520000000, 'AVGO': 4560000000, 'BRK.A': 1500000, 'BRK.B': 2200000000, 'TSLA': 3180000000,
    'JPM': 2900000000, 'WMT': 2700000000, 'LLY': 950000000, 'ORCL': 4200000000, 'V': 2100000000, 'MA': 930000000,
    'NFLX': 440000000, 'XOM': 4000000000, 'COST': 440000000, 'JNJ': 2400000000, 'HD': 990000000, 'PLTR': 2200000000,
    'PG': 2400000000, 'BAC': 8000000000, 'ABBV': 1770000000, 'CVX': 1900000000, 'KO': 4300000000, 'AMD': 1600000000,
    'GE': 1100000000, 'CSCO': 4000000000, 'TMUS': 1200000000, 'WFC': 3600000000, 'CRM': 980000000, 'PM': 1550000000,
    'IBM': 920000000, 'UNH': 920000000, 'MS': 1600000000, 'GS': 340000000, 'INTU': 280000000, 'LIN': 480000000,
    'ABT': 1740000000, 'AXP': 740000000, 'BX': 710000000, 'DIS': 1800000000, 'MCD': 730000000, 'RTX': 670000000,
    'NOW': 200000000, 'MRK': 2540000000, 'CAT': 500000000, 'T': 7150000000, 'PEP': 1380000000, 'UBER': 2100000000,
    'BKNG': 35000000, 'TMO': 380000000, 'VZ': 4200000000, 'SCHW': 1800000000, 'ISRG': 35000000, 'QCOM': 1120000000,
    'C': 1900000000, 'TXN': 910000000, 'BA': 600000000, 'BLK': 150000000, 'ACN': 630000000, 'SPGI': 310000000,
    'AMGN': 540000000, 'ADBE': 460000000, 'BSX': 1470000000, 'SYK': 380000000, 'ETN': 400000000, 'AMAT': 830000000,
    'ANET': 320000000, 'NEE': 2000000000, 'DHR': 740000000, 'HON': 1250000000, 'TJX': 1150000000, 'PGR': 590000000,
    'GILD': 1250000000, 'DE': 280000000, 'PFE': 5700000000, 'COF': 390000000, 'KKR': 880000000, 'PANW': 320000000,
    'UNP': 610000000, 'APH': 120000000, 'LOW': 580000000, 'LRCX': 130000000, 'MU': 1100000000, 'ADP': 410000000,
    'CMCSA': 4000000000, 'COP': 1200000000, 'KLAC': 130000000, 'VRTX': 260000000, 'MDT': 1330000000, 'SNPS': 150000000,
    'NKE': 1540000000, 'CRWD': 240000000, 'ADI': 500000000, 'WELL': 560000000, 'CB': 410000000, 'ICE': 570000000,
    'SBUX': 1150000000, 'TT': 220000000, 'SO': 1100000000, 'CEG': 320000000, 'PLD': 920000000, 'DASH': 400000000,
    'AMT': 460000000, 'MO': 1760000000, 'MMC': 490000000, 'CME': 360000000, 'CDNS': 270000000, 'LMT': 250000000,
    'BMY': 2100000000, 'WM': 400000000, 'PH': 130000000, 'COIN': 240000000, 'DUK': 770000000, 'RCL': 260000000,
    'MCO': 180000000, 'MDLZ': 1360000000, 'DELL': 710000000, 'TDG': 57000000, 'CTAS': 100000000, 'INTC': 4200000000,
    'MCK': 130000000, 'ABNB': 650000000, 'GD': 270000000, 'ORLY': 60000000, 'APO': 600000000, 'SHW': 260000000,
    'HCA': 270000000, 'EMR': 570000000, 'NOC': 150000000, 'MMM': 550000000, 'FTNT': 770000000, 'EQIX': 94000000,
    'CI': 300000000, 'UPS': 860000000, 'FI': 600000000, 'HWM': 420000000, 'AON': 200000000, 'PNC': 400000000,
    'CVS': 1300000000, 'RSG': 320000000, 'AJG': 220000000, 'ITW': 120000000, 'MAR': 300000000, 'ECL': 290000000,
    'MSI': 170000000, 'USB': 1500000000, 'WMB': 1200000000, 'BK': 760000000, 'CL': 830000000, 'NEM': 1150000000,
    'PYPL': 1100000000, 'JCI': 680000000, 'ZTS': 460000000, 'VST': 410000000, 'EOG': 580000000, 'CSX': 2000000000,
    'ELV': 240000000, 'ADSK': 220000000, 'APD': 220000000, 'AZO': 20000000, 'HLT': 260000000, 'WDAY': 260000000,
    'SPG': 300000000, 'NSC': 230000000, 'KMI': 2200000000, 'TEL': 310000000, 'FCX': 1400000000, 'CARR': 860000000,
    'PWR': 140000000, 'REGN': 110000000, 'ROP': 100000000, 'CMG': 28000000, 'DLR': 320000000, 'MNST': 1050000000,
    'TFC': 1300000000, 'TRV': 230000000, 'AEP': 520000000, 'NXPI': 260000000, 'AXON': 75000000, 'URI': 67000000,
    'COR': 200000000, 'FDX': 250000000, 'NDAQ': 580000000, 'AFL': 580000000, 'GLW': 860000000, 'FAST': 570000000,
    'MPC': 400000000, 'SLB': 1400000000, 'SRE': 250000000, 'PAYX': 360000000, 'PCAR': 100000000, 'MET': 730000000,
    'BDX': 290000000, 'OKE': 440000000, 'DDOG': 330000000,
    // International companies
    'TSM': 5200000000, 'SAP': 1200000000, 'ASML': 400000000, 'BABA': 25000000000, 'TM': 13500000000, 'AZN': 1550000000,
    'HSBC': 20000000000, 'NVS': 2100000000, 'SHEL': 6500000000, 'HDB': 5500000000, 'RY': 1400000000, 'NVO': 4500000000,
    'ARM': 10000000000, 'SHOP': 1300000000, 'MUFG': 13000000000, 'PDD': 1300000000, 'UL': 2500000000, 'SONY': 1240000000,
    'TTE': 2500000000, 'BHP': 5000000000, 'SAN': 16000000000, 'TD': 1800000000, 'SPOT': 200000000, 'UBS': 3200000000,
    'IBN': 7000000000, 'SNY': 2500000000, 'BUD': 2000000000, 'BTI': 2200000000, 'BN': 3500000000, 'SMFG': 13000000000,
    'ENB': 2100000000, 'RELX': 950000000, 'TRI': 450000000, 'RACE': 180000000, 'BBVA': 6400000000, 'SE': 570000000,
    'BP': 3000000000, 'NTES': 650000000, 'BMO': 1200000000, 'RIO': 1600000000, 'GSK': 4100000000, 'MFG': 15000000000,
    'INFY': 4100000000, 'CP': 930000000, 'BCS': 17000000000, 'NGG': 4000000000, 'BNS': 1200000000, 'ING': 3600000000,
    'EQNR': 3100000000, 'CM': 930000000, 'CNQ': 1100000000, 'LYG': 15000000000, 'AEM': 490000000, 'DB': 2000000000,
    'NU': 4800000000, 'CNI': 640000000, 'DEO': 2200000000, 'NWG': 9000000000, 'AMX': 6000000000, 'MFC': 1800000000,
    'E': 3500000000, 'WCN': 260000000, 'SU': 1300000000, 'TRP': 1000000000, 'PBR': 13000000000, 'HMC': 1800000000,
    'GRMN': 190000000, 'CCEP': 460000000, 'ALC': 200000000, 'TAK': 3100000000,
    // Additional companies share counts
    'BIDU': 350000000, 'STX': 210000000, 'WBD': 2400000000, 'TME': 1700000000, 'EBAY': 520000000,
    // New companies share counts
    'MSCI': 120000000, 'WST': 74000000, 'IDXX': 83000000, 'FICO': 25000000, 'TER': 160000000, 'CTLT': 180000000, 'CHD': 240000000, 'ILMN': 160000000, 'PAYC': 58000000, 'CSGP': 40000000, 'MKTX': 38000000, 'BKR': 1000000000, 'FSLR': 110000000, 'ENPH': 140000000, 'GNRC': 62000000, 'BALL': 320000000, 'RMD': 150000000, 'TDY': 42000000, 'STZ': 180000000, 'MLM': 62000000, 'VRSK': 140000000, 'WAB': 180000000, 'ATO': 140000000, 'SNA': 54000000, 'BRO': 270000000, 'ROK': 115000000, 'KEYS': 170000000, 'PTC': 120000000, 'INVH': 610000000, 'AVB': 140000000, 'ESS': 64000000, 'PEAK': 550000000, 'MAA': 130000000, 'CPT': 110000000, 'HES': 310000000, 'CF': 200000000, 'MOS': 350000000, 'NTRS': 210000000, 'ZBRA': 52000000, 'LHX': 190000000, 'BAX': 510000000, 'CAH': 240000000, 'HOLX': 240000000
  };

  constructor() {
    this.loadFromCache();
  }

  async updateCache(): Promise<void> {
    if (this.isUpdating) {
      console.log('Update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    console.log('Starting cache update...');

    try {
      const apiKey = process.env.POLYGON_API_KEY;
      
      if (!apiKey || apiKey === 'your_polygon_api_key_here') {
        console.log('No valid API key found. Loading demo data...');
        await this.loadDemoData();
        return;
      }
      
      const batchSize = 5; // Smaller batch size for better reliability
      const results: CachedStockData[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Process tickers in smaller batches with rate limiting
      for (let i = 0; i < this.TICKERS.length; i += batchSize) {
        const batch = this.TICKERS.slice(i, i + batchSize);
        
        // Add delay between batches to respect rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
        
        const batchPromises = batch.map(async (ticker) => {
          try {
            // Use the correct Polygon.io API endpoint for snapshot data (real-time)
            const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
              console.log(`API call failed for ${ticker}: ${response.status}`);
              errorCount++;
              return null;
            }

            const data = await response.json();

            if (!data?.results?.ticker) {
              console.log(`No data returned for ${ticker}`);
              errorCount++;
              return null;
            }

            const tickerData = data.results.ticker;
            const currentPrice = tickerData.lastTrade.p; // Current price from last trade
            const prevClose = tickerData.prevDay.c; // Previous close price
            const percentChange = tickerData.todaysChangePerc; // Use API's calculated percent change
            
            // Calculate market cap
            const shares = this.shareCounts[ticker] || 0;
            const currentMarketCap = shares > 0 ? (currentPrice * shares) / 1000000000 : 0;
            const prevMarketCap = shares > 0 ? (prevClose * shares) / 1000000000 : 0;
            const marketCapDiff = currentMarketCap - prevMarketCap;

            const stockData: CachedStockData = {
              ticker,
              preMarketPrice: currentPrice,
              closePrice: prevClose,
              percentChange,
              marketCapDiff,
              currentMarketCap,
              lastUpdated: new Date()
            };

            successCount++;
            return stockData;
          } catch (error) {
            console.log(`Error fetching data for ${ticker}:`, error);
            errorCount++;
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean) as CachedStockData[]);
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(this.TICKERS.length / batchSize)}: ${batchResults.filter(Boolean).length}/${batch.length} successful`);
      }

      // If we got some data, use it; otherwise fall back to demo data
      if (results.length > 0) {
        // Update cache with results
        this.cache.clear();
        results.forEach(stock => {
          if (stock) {
            this.cache.set(stock.ticker, stock);
          }
        });

        // Save to Redis (with fallback to local cache)
        try {
          await setCachedData(CACHE_KEYS.STOCK_DATA, results);
          await setCacheStatus({
            count: results.length,
            lastUpdated: new Date(),
            isUpdating: false,
            successCount,
            errorCount
          });
          console.log(`✅ Redis cache updated with ${results.length} stocks at ${new Date().toISOString()}`);
        } catch (error) {
          console.log('Redis unavailable, using local cache only');
          // Store status locally if Redis fails
          this.cacheStatus = {
            count: results.length,
            lastUpdated: new Date(),
            isUpdating: false,
            successCount,
            errorCount
          };
        }

        console.log(`Cache updated with ${results.length} stocks at ${new Date().toISOString()}`);
        console.log(`Success: ${successCount}, Errors: ${errorCount}`);
      } else {
        console.log('No live data available, loading demo data...');
        await this.loadDemoData();
      }

    } catch (error) {
      console.error('Cache update failed:', error);
      console.log('Loading demo data as fallback...');
      await this.loadDemoData();
    } finally {
      this.isUpdating = false;
    }
  }

  async loadDemoData(): Promise<void> {
    const demoStocks: CachedStockData[] = [
      { ticker: 'NVDA', preMarketPrice: 176.36, closePrice: 176.75, percentChange: -0.22, marketCapDiff: -9.52, currentMarketCap: 4231, lastUpdated: new Date() },
      { ticker: 'MSFT', preMarketPrice: 512.09, closePrice: 512.50, percentChange: -0.08, marketCapDiff: -3.06, currentMarketCap: 3818, lastUpdated: new Date() },
      { ticker: 'AAPL', preMarketPrice: 212.14, closePrice: 214.04, percentChange: -0.89, marketCapDiff: -28.60, currentMarketCap: 3194, lastUpdated: new Date() },
      { ticker: 'AMZN', preMarketPrice: 231.47, closePrice: 232.80, percentChange: -0.57, marketCapDiff: -14.01, currentMarketCap: 2457, lastUpdated: new Date() },
      { ticker: 'GOOGL', preMarketPrice: 195.13, closePrice: 192.58, percentChange: 1.32, marketCapDiff: 14.84, currentMarketCap: 2336, lastUpdated: new Date() },
      { ticker: 'META', preMarketPrice: 709.81, closePrice: 717.64, percentChange: -1.09, marketCapDiff: -16.98, currentMarketCap: 1792, lastUpdated: new Date() },
      { ticker: 'AVGO', preMarketPrice: 298.67, closePrice: 294.31, percentChange: 1.48, marketCapDiff: 20.55, currentMarketCap: 1365, lastUpdated: new Date() },
      { ticker: 'BRK.B', preMarketPrice: 380.40, closePrice: 378.88, percentChange: 0.40, marketCapDiff: 1.6, currentMarketCap: 300, lastUpdated: new Date() }
    ];

    this.cache.clear();
    demoStocks.forEach(stock => {
      this.cache.set(stock.ticker, stock);
    });

    // Store status locally
    this.cacheStatus = {
      count: demoStocks.length,
      lastUpdated: new Date(),
      isUpdating: false,
      successCount: demoStocks.length,
      errorCount: 0
    };

    try {
      await setCachedData(CACHE_KEYS.STOCK_DATA, demoStocks);
      await setCacheStatus(this.cacheStatus);
      console.log('✅ Demo data saved to Redis');
    } catch (error) {
      console.log('Redis unavailable, demo data stored locally only');
    }
  }

  startBackgroundUpdates(): void {
    // Update every 30 minutes (reduced frequency)
    this.updateInterval = setInterval(() => {
      this.updateCache();
    }, 30 * 60 * 1000);

    // Initial update with delay to avoid blocking startup
    setTimeout(() => {
      this.updateCache();
    }, 5000);
  }

  stopBackgroundUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async getAllStocks(): Promise<CachedStockData[]> {
    // Try to load from cache first
    if (this.cache.size === 0) {
      await this.loadFromCache();
    }
    
    return Array.from(this.cache.values());
  }

  getStock(ticker: string): CachedStockData | null {
    return this.cache.get(ticker) || null;
  }

  getCompanyName(ticker: string): string {
    return this.companyNames[ticker] || ticker;
  }

  getShareCount(ticker: string): number {
    return this.shareCounts[ticker] || 1000000000;
  }

  getAllTickers(): string[] {
    return this.TICKERS;
  }

  async clearCache(): Promise<void> {
    // Clear local cache
    this.cache.clear();
    
    // Clear Redis cache
    try {
      await setCachedData(CACHE_KEYS.STOCK_DATA, []);
      await setCacheStatus({
        count: 0,
        lastUpdated: new Date(),
        isUpdating: false,
        successCount: 0,
        errorCount: 0
      });
      console.log('🧹 Cache cleared successfully');
    } catch (error) {
      console.log('Redis unavailable, cleared local cache only');
      this.cacheStatus = {
        count: 0,
        lastUpdated: new Date(),
        isUpdating: false,
        successCount: 0,
        errorCount: 0
      };
    }
  }

  async updateCacheWithData(data: CachedStockData[]): Promise<void> {
    // Update local cache
    this.cache.clear();
    data.forEach(stock => {
      this.cache.set(stock.ticker, stock);
    });

    // Save to Redis (with fallback to local cache)
    try {
      await setCachedData(CACHE_KEYS.STOCK_DATA, data);
      await setCacheStatus({
        count: data.length,
        lastUpdated: new Date(),
        isUpdating: false,
        successCount: data.length,
        errorCount: 0
      });
      console.log(`✅ Redis cache updated with ${data.length} stocks`);
    } catch (error) {
      console.log('Redis unavailable, using local cache only');
      // Store status locally if Redis fails
      this.cacheStatus = {
        count: data.length,
        lastUpdated: new Date(),
        isUpdating: false,
        successCount: data.length,
        errorCount: 0
      };
    }
  }

  async getCacheStatus(): Promise<{ count: number; lastUpdated: Date | null; isUpdating: boolean }> {
    try {
      const status = await getCacheStatus();
      if (status) {
        return {
          count: status.count || this.cache.size,
          lastUpdated: status.lastUpdated || null,
          isUpdating: this.isUpdating
        };
      }
    } catch (error) {
      console.log('Redis unavailable, using local cache status');
    }
    
    // Fallback to local cache status
    return {
      count: this.cacheStatus?.count || this.cache.size,
      lastUpdated: this.cacheStatus?.lastUpdated || null,
      isUpdating: this.isUpdating
    };
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cachedData = await getCachedData(CACHE_KEYS.STOCK_DATA);
      if (cachedData && Array.isArray(cachedData)) {
        this.cache.clear();
        cachedData.forEach((stock: CachedStockData) => {
          this.cache.set(stock.ticker, stock);
        });
        console.log(`✅ Loaded ${cachedData.length} stocks from Redis cache`);
      }
    } catch (error) {
      console.log('Failed to load from Redis cache, using local cache only');
      // If Redis fails, try to load demo data if cache is empty
      if (this.cache.size === 0) {
        console.log('Loading demo data as fallback...');
        await this.loadDemoData();
      }
    }
  }
}

export const stockDataCache = new StockDataCache(); 