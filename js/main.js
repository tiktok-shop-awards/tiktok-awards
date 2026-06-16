// MAIN.JS VERSION: 20260601a
// TikTok Shop Stars Awards - Main JavaScript

// ==================== Global Data Store ====================
const AppData = {
  global: null,
  regional: {
    us: null,
    eu: null,
    sea: null,
    latam: null,
    fs: null
  },
  rankings: null,
  currentYear: '2025',
  currentRegion: 'us',
  currentPeriod: 'H1 Project Awards', // For Regional page: H1 Project Awards | H2 Project Awards | H2 Individual Awards
  currentHalf: 'H1', // For Global page: H1 | H2
  currentLatamQuarter: 'Q1' // For LATAM individual awards: Q1 | Q2 | Q3 | Q4
};

// ==================== Utility Functions ====================
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function setUrlParam(param, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.pushState({}, '', url);
}

// Toast notification (replaces alert for non-blocking messages)
function showToast(message, duration = 3000) {
  // Remove existing toast if any
  const existingToast = document.getElementById('app-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.style.cssText = `
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.85); color: #fff; padding: 12px 28px;
    border-radius: 8px; font-size: 14px; z-index: 10000;
    transition: opacity 0.3s ease; pointer-events: none;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function formatCurrency(amount, currency = 'USD') {
  if (!amount) return 'TBD';
  
  const symbol = currency === 'CNY' ? '¥' : '$';
  return symbol + Number(amount).toLocaleString();
}

function formatBonus(amount, currency = 'USD') {
  if (!amount || amount === 0) return 'TBD';
  const symbol = currency === 'CNY' ? '¥' : '$';
  if (amount >= 1000000) {
    return symbol + (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return symbol + (amount / 1000).toFixed(0) + 'K';
  }
  return symbol + amount;
}

function truncateText(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ==================== Navigation Functions ====================
function highlightNavigation() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === currentPage) {
      item.classList.add('active');
    }
  });
  
  // Handle index.html
  if (currentPage === 'index.html' || currentPage === '' || currentPage === '/') {
    const homeNav = document.querySelector('.nav-item[href="index.html"]');
    if (homeNav) homeNav.classList.add('active');
  }
}

// 更新2026年份按钮的Coming Soon标签
function updateYear2026Button() {
  const year2026Btn = document.getElementById('year-2026-btn');
  if (!year2026Btn) return;
  
  const page = window.location.pathname.split('/').pop();
  
  // HomePage和Regional页面（LATAM区域）：2026按钮可点击，不显示Coming Soon
  if (page === 'index.html' || page === '' || page === '/') {
    // HomePage：2026年有LATAM数据，所以可以点击
    year2026Btn.innerHTML = '2026';
    return;
  }
  
  // Global页面：始终显示Coming Soon
  if (page === 'global.html') {
    year2026Btn.innerHTML = '2026 <span class="coming-soon-tag" style="opacity: 0.6;">· Coming Soon</span>';
    return;
  }
  
  // Regional页面：只有LATAM区域不显示Coming Soon
  if (page === 'regional.html') {
    if (AppData.currentRegion === 'latam') {
      year2026Btn.innerHTML = '2026';
    } else {
      year2026Btn.innerHTML = '2026 <span class="coming-soon-tag" style="opacity: 0.6;">· Coming Soon</span>';
    }
    return;
  }
  
  // Departmental页面：2026可用，不显示Coming Soon
  if (page === 'departmental.html') {
    year2026Btn.innerHTML = '2026';
    return;
  }
}

function initYearNavigation() {
  const yearBtns = document.querySelectorAll('.year-btn');
  const page = window.location.pathname.split('/').pop();
  const defaultYear = '2026';
  const urlYear = getUrlParam('year') || defaultYear;
  
  AppData.currentYear = urlYear;
  
  // 初始化时更新2026按钮状态
  updateYear2026Button();
  
  yearBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.year === urlYear) {
      btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => {
      const page = window.location.pathname.split('/').pop();
      const targetYear = btn.dataset.year;
      
      // 如果点击的是当前已选中的年份，不做任何操作
      if (targetYear === AppData.currentYear) return;
      
      // Global 页面不允许选择 2026
      if (page === 'global.html' && targetYear === '2026') {
        showToast('2026 data is not available yet. Coming soon!');
        return;
      }
      
      // 无刷新切换：更新URL参数
      setUrlParam('year', targetYear);
      
      // 更新状态
      AppData.currentYear = targetYear;
      
      // 更新按钮active状态
      yearBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // 更新2026按钮状态
      updateYear2026Button();
      
      // 派发年份变更事件，让各页面监听器重新加载数据
      window.dispatchEvent(new CustomEvent('yearChanged', { detail: { year: targetYear } }));
    });
  });
}

function initRegionNavigation() {
  const regionBtns = document.querySelectorAll('.region-btn');
  const urlRegion = getUrlParam('region') || 'us';
  
  AppData.currentRegion = urlRegion;
  
  // 初始化时更新2026按钮状态
  updateYear2026Button();
  
  regionBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.region === urlRegion) {
      btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => {
      const page = window.location.pathname.split('/').pop();
      const baseUrl = window.location.href.split('?')[0].replace(/\/[^\/]*$/, '/');
      window.location.href = `${baseUrl}${page}?year=${AppData.currentYear}&region=${btn.dataset.region}`;
    });
  });
}

function initDeptNavigation() {
  // Support both .dept-btn (legacy) and .region-btn (new) with data-dept attribute
  const deptBtns = document.querySelectorAll('.dept-btn, .region-btn[data-dept]');
  const urlDept = getUrlParam('dept');
  
  if (urlDept) {
    AppData.currentDept = urlDept;
  }
  
  deptBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.dept === urlDept) {
      btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => {
      const page = window.location.pathname.split('/').pop();
      const baseUrl = window.location.href.split('?')[0].replace(/\/[^\/]*$/, '/');
      const quarter = getUrlParam('quarter') || 'Q1';
      window.location.href = `${baseUrl}${page}?year=${AppData.currentYear}&dept=${btn.dataset.dept}&quarter=${quarter}`;
    });
  });
}

// ==================== Data Loading Functions ====================
async function loadData(level, region = null, year = null) {
  try {
    let dataFile;
    
    if (level === 'global') {
      dataFile = 'data/global.json?v=20260601a';
    } else if (level === 'regional' && region) {
      dataFile = 'data/' + region + '.json?v=20260601a';
    } else if (level === 'fs') {
      dataFile = 'data/fs.json?v=20260601a';
    } else if (level === 'pop') {
      dataFile = 'data/pop.json?v=20260601a';
    }
    
    const response = await fetch(dataFile);
    if (!response.ok) throw new Error(`Failed to load ${dataFile}`);
    
    let data = await response.json();
    // Normalize Chinese keys to English when loading zh data
    // data normalized (keys already English)
    
    // 根据年份筛选数据
    const targetYear = year || AppData.currentYear || '2026';
    
    // 检查数据是否是多年份结构
    const hasYearStructure = data['2025'] || data['2026'];
    
    // ========== 数据年份规则（重要！）==========
    // - FS/POP: 只有2025年数据，无年份结构，2026年返回null
    // - US/EU/SEA/LATAM/Global: 有多年份结构（2025/2026），按年份返回对应数据
    // - 没有年份结构的数据文件：视为2025年数据，2026年返回null
    // ==========================================
    
    if (level === 'fs') {
      // FS数据只有2025年，无年份结构
      if (targetYear === '2025') {
        AppData.regional.fs = data;
        return data;
      } else {
        return null;
      }
    }
    if (level === 'pop') {
      // POP数据只有2025年，无年份结构
      if (targetYear === '2025') {
        AppData.regional.pop = data;
        return data;
      } else {
        return null;
      }
    }
    
    if (hasYearStructure) {
      // 多年份数据结构：返回对应年份数据
      if (data[targetYear]) {
        const yearData = data[targetYear];
        if (level === 'global') {
          AppData.global = yearData;
        } else if (level === 'regional') {
          AppData.regional[region] = yearData;
        }
        return yearData;
      } else {
        // 请求的年份不存在，返回null
        return null;
      }
    } else {
      // 非多年份结构：直接返回数据（假设是2025年数据）
      // 只有2025年时才返回数据，2026年返回null
      if (targetYear === '2025') {
        if (level === 'global') {
          AppData.global = data;
        } else if (level === 'regional') {
          AppData.regional[region] = data;
        }
        return data;
      } else {
        return null;
      }
    }
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
}

async function loadRankings(year = null) {
  try {
    const response = await fetch('data/rankings.json?v=20260601a');
    if (!response.ok) throw new Error('Failed to load rankings');
    
    const data = await response.json();
    AppData.rankings = data;
    
    // 如果指定了年份，返回该年份的数据
    if (year && data[year]) {
      return data[year];
    }
    
    // 否则返回当前年份的数据
    const currentYear = AppData.currentYear || '2026';
    return data[currentYear] || data['2025'];
  } catch (error) {
    console.error('Error loading rankings:', error);
    return null;
  }
}

// ==================== Helper Functions for Quarterly Data (Q1/Q2/Q3/Q4) ====================

// Get Q1 project awards
function getQ1ProjectAwards(data) {
  if (!data) return [];
  // Support both quarterly (Q1 Project Awards) and legacy (H1 Project Awards) structure
  if (data['Q1 Project Awards']) {
    return data['Q1 Project Awards'];
  }
  // Legacy: H1 Project Awards中quarter为Q1的
  const h1Awards = data['H1 Project Awards'] || [];
  return h1Awards.filter(a => a.quarter === 'Q1' || a.period === 'Q1');
}

// Get Q2 project awards
function getQ2ProjectAwards(data) {
  if (!data) return [];
  if (data['Q2 Project Awards']) {
    return data['Q2 Project Awards'];
  }
  const h1Awards = data['H1 Project Awards'] || [];
  return h1Awards.filter(a => a.quarter === 'Q2' || a.period === 'Q2');
}

// Get Q3 project awards
function getQ3ProjectAwards(data) {
  if (!data) return [];
  if (data['Q3 Project Awards']) {
    return data['Q3 Project Awards'];
  }
  const h2Awards = data['H2 Project Awards'] || [];
  return h2Awards.filter(a => a.quarter === 'Q3' || a.period === 'Q3');
}

// Get Q4 project awards
function getQ4ProjectAwards(data) {
  if (!data) return [];
  if (data['Q4 Project Awards']) {
    return data['Q4 Project Awards'];
  }
  const h2Awards = data['H2 Project Awards'] || [];
  return h2Awards.filter(a => a.quarter === 'Q4' || a.period === 'Q4');
}

// Legacy support: Get H1 project awards (Q1 + Q2)
function getH1ProjectAwards(data) {
  if (!data) return [];
  if (data['H1 Project Awards']) {
    return data['H1 Project Awards'];
  }
  return [...getQ1ProjectAwards(data), ...getQ2ProjectAwards(data)];
}

// Legacy support: Get H2 project awards (Q3 + Q4)
function getH2ProjectAwards(data) {
  if (!data) return [];
  if (data['H2 Project Awards']) {
    return data['H2 Project Awards'];
  }
  return [...getQ3ProjectAwards(data), ...getQ4ProjectAwards(data)];
}

// Combine all project awards into single array
function getAllProjectAwards(data) {
  if (!data) return [];
  return [...getQ1ProjectAwards(data), ...getQ2ProjectAwards(data), ...getQ3ProjectAwards(data), ...getQ4ProjectAwards(data)];
}

// Get all individual awards
function getAllIndividualAwards(data) {
  if (!data) return [];
  return data['H2 Individual Awards'] || [];
}

// Get individual awards by quarter (for LATAM)
function getIndividualAwardsByQuarter(data, quarter) {
  if (!data) return [];
  // Support both legacy and year-based structure
  const currentYear = AppData.currentYear || '2026';
  if (hasYearStructure(data)) {
    const yearData = data[currentYear];
    if (!yearData) return [];
    const allIndividual = yearData['H2 Individual Awards'] || [];
    return allIndividual.filter(a => a.quarter === quarter || a.period === quarter);
  }
  const allIndividual = data['H2 Individual Awards'] || [];
  return allIndividual.filter(a => a.quarter === quarter || a.period === quarter);
}

// ==================== Helper Functions for Year-based Data Structure ====================

// Check if data uses year-based structure (LATAM 2026+)
function hasYearStructure(data) {
  if (!data) return false;
  // Year-based structure has keys like "2025", "2026" which are numeric strings
  return Object.keys(data).some(key => /^\d{4}$/.test(key));
}

// Get data for specific year
function getYearData(data, year) {
  if (!data) return null;
  if (hasYearStructure(data)) {
    return data[year] || null;
  }
  // Quarterly structure - return entire data
  return data;
}

// Get Q1 project awards (year-based structure)
function getQ1ProjectAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  if (yearData['Q1 Project Awards']) return yearData['Q1 Project Awards'];
  const h1Awards = yearData['H1 Project Awards'] || [];
  return h1Awards.filter(a => a.quarter === 'Q1' || a.period === 'Q1');
}

// Get Q2 project awards (year-based structure)
function getQ2ProjectAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  if (yearData['Q2 Project Awards']) return yearData['Q2 Project Awards'];
  const h1Awards = yearData['H1 Project Awards'] || [];
  return h1Awards.filter(a => a.quarter === 'Q2' || a.period === 'Q2');
}

// Get Q3 project awards (year-based structure)
function getQ3ProjectAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  if (yearData['Q3 Project Awards']) return yearData['Q3 Project Awards'];
  const h2Awards = yearData['H2 Project Awards'] || [];
  return h2Awards.filter(a => a.quarter === 'Q3' || a.period === 'Q3');
}

// Get Q4 project awards (year-based structure)
function getQ4ProjectAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  if (yearData['Q4 Project Awards']) return yearData['Q4 Project Awards'];
  const h2Awards = yearData['H2 Project Awards'] || [];
  return h2Awards.filter(a => a.quarter === 'Q4' || a.period === 'Q4');
}

// Legacy support: Get H1 project awards (year-based structure)
function getH1ProjectAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  if (yearData['H1 Project Awards']) return yearData['H1 Project Awards'];
  return [...getQ1ProjectAwardsYear(data, year), ...getQ2ProjectAwardsYear(data, year)];
}

// Legacy support: Get H2 project awards (year-based structure)
function getH2ProjectAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  if (yearData['H2 Project Awards']) return yearData['H2 Project Awards'];
  return [...getQ3ProjectAwardsYear(data, year), ...getQ4ProjectAwardsYear(data, year)];
}

// Get H1 individual awards (year-based structure, for LATAM 2026)
function getQ1IndividualAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  return yearData['Q1 Individual Awards'] || [];
}

// Get H2 individual awards (year-based structure)
function getH2IndividualAwardsYear(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  return yearData['H2 Individual Awards'] || [];
}

// Get LATAM individual awards by year and period
function getLatamIndividualAwards(data, year, period) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  
  if (period === 'Q1 Individual Awards') {
    return yearData['Q1 Individual Awards'] || [];
  } else if (period === 'H2 Individual Awards') {
    return yearData['H2 Individual Awards'] || [];
  }
  return [];
}

// Get available award periods for LATAM by year
function getAvailableLatamPeriods(data, year) {
  const yearData = getYearData(data, year);
  if (!yearData) return [];
  
  const periods = [];
  if (yearData['Q1 Individual Awards'] && yearData['Q1 Individual Awards'].length > 0) {
    periods.push('Q1 Individual Awards');
  }
  if (yearData['H2 Individual Awards'] && yearData['H2 Individual Awards'].length > 0) {
    periods.push('H2 Individual Awards');
  }
  if (yearData['H1 Project Awards'] && yearData['H1 Project Awards'].length > 0) {
    periods.push('H1 Project Awards');
  }
  if (yearData['H2 Project Awards'] && yearData['H2 Project Awards'].length > 0) {
    periods.push('H2 Project Awards');
  }
  return periods;
}

// ==================== Ranking Functions ====================

// Calculate FULL YEAR Top 3 for Global (combining H1 + H2)
function calculateGlobalTop3FullYear(globalData) {
  if (!globalData) return [];
  
  const allAwards = getAllProjectAwards(globalData);
  const memberScores = {};
  
  // Helper to get safe department value
  const getSafeDept = (dept, defaultVal) => {
    if (dept && dept !== 'undefined' && dept !== 'null' && dept !== '') return dept;
    return defaultVal || 'Global';
  };
  
  allAwards.forEach(award => {
    if (!award.members) return;
    award.members.forEach(memberName => {
      const key = memberName;
      if (!memberScores[key]) {
        memberScores[key] = {
          name: memberName,
          score: 0,
          awards: 0,
          email: award.email || '',
          department: getSafeDept(award.department, 'Global')
        };
      }
      memberScores[key].score += 5; // Global = 5 points
      memberScores[key].awards += 1;
    });
  });
  
  return Object.values(memberScores)
    .sort((a, b) => b.score - a.score || b.awards - a.awards)
    .slice(0, 3);
}

// Calculate FULL YEAR Top 10 for Global (combining H1 + H2)
function calculateGlobalTop10FullYear(globalData) {
  if (!globalData) return [];
  
  const allAwards = getAllProjectAwards(globalData);
  const memberScores = {};
  
  const getSafeDept = (dept, defaultVal) => {
    if (dept && dept !== 'undefined' && dept !== 'null' && dept !== '') return dept;
    return defaultVal || 'Global';
  };
  
  allAwards.forEach(award => {
    if (!award.members) return;
    award.members.forEach(memberName => {
      const key = memberName;
      if (!memberScores[key]) {
        memberScores[key] = {
          name: memberName,
          score: 0,
          awards: 0,
          email: award.email || '',
          department: getSafeDept(award.department, 'Global')
        };
      }
      memberScores[key].score += 5;
      memberScores[key].awards += 1;
    });
  });
  
  return Object.values(memberScores)
    .sort((a, b) => b.score - a.score || b.awards - a.awards)
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

// Calculate Top 3 by period (H1 or H2 only)
function calculateGlobalTop3(globalData, half) {
  if (!globalData) return [];
  
  const memberScores = {};
  
  const getSafeDept = (dept, defaultVal) => {
    if (dept && dept !== 'undefined' && dept !== 'null' && dept !== '') return dept;
    return defaultVal || 'Global';
  };
  
  let awards = [];
  if (half === 'H1') {
    awards = getH1ProjectAwards(globalData);
  } else {
    awards = getH2ProjectAwards(globalData);
  }
  
  awards.forEach(award => {
    if (!award.members) return;
    award.members.forEach(memberName => {
      const key = memberName;
      if (!memberScores[key]) {
        memberScores[key] = {
          name: memberName,
          score: 0,
          awards: 0,
          email: award.email || '',
          department: getSafeDept(award.department, 'Global')
        };
      }
      memberScores[key].score += 5;
      memberScores[key].awards += 1;
    });
  });
  
  return Object.values(memberScores)
    .sort((a, b) => b.score - a.score || b.awards - a.awards)
    .slice(0, 3);
}

function calculateRegionTop3(regionData, region, period) {
  if (!regionData) return [];
  
  let memberScores = {};
  
  const getSafeDept = (dept, reg, defaultVal) => {
    if (dept && dept !== 'undefined' && dept !== 'null' && dept !== '') return dept;
    if (reg && reg !== 'undefined' && reg !== 'null' && reg !== '') return reg;
    return defaultVal || 'TikTok Shop';
  };
  
  if (period === 'H1 Project Awards') {
    const h1Awards = getH1ProjectAwards(regionData);
    h1Awards.forEach(award => {
      if (!award.members) return;
      award.members.forEach(memberName => {
        const key = memberName;
        if (!memberScores[key]) {
          memberScores[key] = {
            name: memberName,
            score: 0,
            awards: 0,
            email: award.email || '',
            department: getSafeDept(award.department, region, 'Regional')
          };
        }
        memberScores[key].score += 3;
        memberScores[key].awards += 1;
      });
    });
  } else if (period === 'H2 Project Awards') {
    const h2Awards = getH2ProjectAwards(regionData);
    h2Awards.forEach(award => {
      if (!award.members) return;
      award.members.forEach(memberName => {
        const key = memberName;
        if (!memberScores[key]) {
          memberScores[key] = {
            name: memberName,
            score: 0,
            awards: 0,
            email: award.email || '',
            department: getSafeDept(award.department, region, 'Regional')
          };
        }
        memberScores[key].score += 3;
        memberScores[key].awards += 1;
      });
    });
  } else if (period === 'H2 Individual Awards') {
    const individualAwards = region === 'latam' 
      ? getIndividualAwardsByQuarter(regionData, AppData.currentLatamQuarter)
      : getAllIndividualAwards(regionData);
    
    individualAwards.forEach(award => {
      // Handle both winner_name and members array formats
      const memberNames = award.members || (award.winner_name ? [award.winner_name] : []);
      const dept = getSafeDept(award.department, region, 'Regional');
      
      memberNames.forEach(memberName => {
        const memberNameStr = typeof memberName === 'string' ? memberName : memberName.name;
        if (memberNameStr) {
          if (!memberScores[memberNameStr]) {
            memberScores[memberNameStr] = {
              name: memberNameStr,
              score: 0,
              awards: 0,
              email: award.email || '',
              department: dept
            };
          }
          memberScores[memberNameStr].score += 3;
          memberScores[memberNameStr].awards += 1;
        }
      });
    });
  }
  
  return Object.values(memberScores)
    .sort((a, b) => b.score - a.score || b.awards - a.awards)
    .slice(0, 3);
}

// Full Year Regional Top 3 - ignores award type filter, combines all regional awards
function calculateRegionTop3FullYear(regionData, region) {
  if (!regionData) return [];
  
  let memberScores = {};
  const currentYear = AppData.currentYear || '2026';
  
  const getSafeDept = (dept, reg, defaultVal) => {
    if (dept && dept !== 'undefined' && dept !== 'null' && dept !== '') return dept;
    if (reg && reg !== 'undefined' && reg !== 'null' && reg !== '') return reg;
    return defaultVal || 'Regional';
  };
  
  // Include ALL award types for full year ranking (using year-aware functions)
  const h1Awards = getH1ProjectAwardsYear(regionData, currentYear);
  const h2Awards = getH2ProjectAwardsYear(regionData, currentYear);
  
  // For LATAM, combine all quarters or Q1 Individual Awards based on year
  let allIndividualAwards = [];
  if (region === 'latam') {
    if (currentYear === '2026') {
      // 2026: use Q1 Individual Awards
      allIndividualAwards = getQ1IndividualAwardsYear(regionData, currentYear);
    } else {
      // 2025: use Q1-Q4 quarters
      allIndividualAwards = getIndividualAwardsByQuarter(regionData, 'Q1').concat(
        getIndividualAwardsByQuarter(regionData, 'Q2'),
        getIndividualAwardsByQuarter(regionData, 'Q3'),
        getIndividualAwardsByQuarter(regionData, 'Q4')
      );
    }
  } else {
    allIndividualAwards = getH2IndividualAwardsYear(regionData, currentYear);
  }
  
  // Process all awards (3 pts each)
  [...h1Awards, ...h2Awards].forEach(award => {
    if (!award.members) return;
    const dept = getSafeDept(award.department, region, 'Regional');
    award.members.forEach(memberName => {
      if (!memberScores[memberName]) {
        memberScores[memberName] = { name: memberName, score: 0, awards: 0, department: dept };
      }
      memberScores[memberName].score += 3;
      memberScores[memberName].awards += 1;
    });
  });
  
  allIndividualAwards.forEach(award => {
    // Handle both winner_name and members array formats
    const memberNames = award.members || (award.winner_name ? [award.winner_name] : []);
    const dept = getSafeDept(award.department, award.region, 'Regional');
    
    memberNames.forEach(memberName => {
      const memberNameStr = typeof memberName === 'string' ? memberName : memberName.name;
      if (memberNameStr) {
        if (!memberScores[memberNameStr]) {
          memberScores[memberNameStr] = { name: memberNameStr, score: 0, awards: 0, department: dept };
        }
        memberScores[memberNameStr].score += 3;
        memberScores[memberNameStr].awards += 1;
      }
    });
  });
  
  return Object.values(memberScores)
    .sort((a, b) => b.score - a.score || b.awards - a.awards)
    .slice(0, 3);
}

// ==================== Render Functions ====================
function renderPodium(top3, containerId, title) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (top3.length === 0) {
    container.innerHTML = '<div class="no-data-msg">No rankings available for this selection</div>';
    return;
  }
  
  const getDept = (item) => {
    if (item.department && item.department !== 'undefined') return item.department;
    if (item.region && item.region !== 'undefined') return item.region;
    return 'TikTok Shop';
  };
  
  const getScore = (item) => item.score || item.points || 0;
  
  // Calculate actual rank based on scores (ties get same rank)
  const calculateRanks = (items) => {
    const sortedScores = [...new Set(items.map(getScore))].sort((a, b) => b - a);
    return items.map(item => {
      const score = getScore(item);
      return sortedScores.indexOf(score) + 1;
    });
  };
  
  const ranks = calculateRanks(top3);
  
  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };
  
  const getPodiumClass = (rank) => {
    if (rank === 1) return 'first';
    if (rank === 2) return 'second';
    if (rank === 3) return 'third';
    return '';
  };
  
  let html = `
    <div class="podium">
      ${top3[1] ? `
        <div class="podium-item ${getPodiumClass(ranks[1])}">
          <div class="podium-medal">${getMedal(ranks[1])}</div>
          <div class="podium-rank">#${ranks[1]}</div>
          <div class="podium-name">${top3[1].name}</div>
          <div class="podium-dept">${getDept(top3[1])}</div>
          <div class="podium-score">${getScore(top3[1])} pts</div>
        </div>
      ` : ''}
      ${top3[0] ? `
        <div class="podium-item ${getPodiumClass(ranks[0])}">
          <div class="podium-medal">${getMedal(ranks[0])}</div>
          <div class="podium-rank">#${ranks[0]}</div>
          <div class="podium-name">${top3[0].name}</div>
          <div class="podium-dept">${getDept(top3[0])}</div>
          <div class="podium-score">${getScore(top3[0])} pts</div>
        </div>
      ` : ''}
      ${top3[2] ? `
        <div class="podium-item ${getPodiumClass(ranks[2])}">
          <div class="podium-medal">${getMedal(ranks[2])}</div>
          <div class="podium-rank">#${ranks[2]}</div>
          <div class="podium-name">${top3[2].name}</div>
          <div class="podium-dept">${getDept(top3[2])}</div>
          <div class="podium-score">${getScore(top3[2])} pts</div>
        </div>
      ` : ''}
    </div>
  `;
  
  container.innerHTML = html;
}

function renderRankingList(rankings, startRank = 4, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !rankings || rankings.length === 0) return;
  
  let html = '<div class="ranking-list">';
  
  // rankings already contains items starting from the correct rank
  for (let i = 0; i < rankings.length; i++) {
    const r = rankings[i];
    html += `
      <div class="ranking-item">
        <span class="ranking-rank">#${r.rank || i + startRank}</span>
        <span class="ranking-name">${r.name}</span>
        <span class="ranking-dept">${r.department || r.region || ''}</span>
        <span class="ranking-score">${r.points || r.score || 0} pts</span>
      </div>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

// ==================== Card Interaction Functions ====================
// Uses AIPA API with localStorage fallback

// localStorage fallback helpers
function _lsGetLikes() {
  return JSON.parse(localStorage.getItem('likes') || '{}');
}
function _lsSetLikes(likes) {
  localStorage.setItem('likes', JSON.stringify(likes));
}
function _lsGetComments(cardId) {
  return JSON.parse(localStorage.getItem(`comments_${cardId}`) || '[]');
}
function _lsSetComments(cardId, comments) {
  localStorage.setItem(`comments_${cardId}`, JSON.stringify(comments));
}

// Track if API mode is active
let _useApiMode = null; // null = not checked yet, true/false

async function _isApiMode() {
  if (_useApiMode !== null) return _useApiMode;
  if (typeof AwardAPI !== 'undefined') {
    _useApiMode = await AwardAPI.checkAvailability();
  } else {
    _useApiMode = false;
  }
  return _useApiMode;
}

// Toggle like (heart) - like/unlike
async function toggleLike(cardId, awardType, awardName) {
  if (await _isApiMode()) {
    // API mode
    try {
      const user = await getCurrentUser();
      const result = await AwardAPI.toggleLike(cardId, user.userId);
      if (result) {
        updateLikeDisplay(cardId, result.liked, result.like_count);
        return;
      }
    } catch (e) {
      console.warn('[toggleLike] API failed, falling back to localStorage', e);
    }
  }

  // localStorage fallback
  const storageKey = `like_${cardId}`;
  let likes = _lsGetLikes();
  
  if (likes[storageKey]) {
    delete likes[storageKey];
  } else {
    likes[storageKey] = {
      type: awardType,
      name: awardName,
      timestamp: Date.now()
    };
  }
  
  _lsSetLikes(likes);
  updateLikeDisplay(cardId, !!likes[storageKey], likes[storageKey] ? 1 : 0);
}

function updateLikeDisplay(cardId, isLiked, likeCount) {
  const likeBtn = document.querySelector(`[data-card-id="${cardId}"] .like-btn`);
  if (likeBtn) {
    const countSpan = likeBtn.querySelector('.like-count');
    if (countSpan) {
      countSpan.textContent = (likeCount !== undefined) ? likeCount : (isLiked ? '1' : '0');
    }
    if (isLiked) {
      likeBtn.classList.add('liked');
    } else {
      likeBtn.classList.remove('liked');
    }
  }
}

function getLikeCount(cardId) {
  // In API mode: return 0 initially, loadAllCardInteractions will update async
  // In localStorage mode or before API check: read from localStorage for immediate display
  if (_useApiMode !== true) {
    const storageKey = `like_${cardId}`;
    const likes = _lsGetLikes();
    return likes[storageKey] ? 1 : 0;
  }
  return 0;
}

// ==================== Comment Functions ====================
function showCommentsModal(cardId, awardName, awardType) {
  const modal = document.getElementById('comments-modal');
  const modalTitle = document.getElementById('comments-modal-title');
  const commentList = document.getElementById('comment-list');
  const commentInput = document.getElementById('comment-input');
  
  if (!modal) return;
  
  modalTitle.textContent = `${awardName}`;
  
  // Store current card info
  modal.dataset.cardId = cardId;
  modal.dataset.awardName = awardName;
  modal.dataset.awardType = awardType;
  
  // Show loading state
  commentList.innerHTML = '<div class="no-comments">Loading comments...</div>';
  
  // Clear and focus input
  if (commentInput) {
    commentInput.value = '';
    commentInput.focus();
  }
  
  modal.classList.add('active');
  
  // Load comments asynchronously
  _loadCommentsForModal(cardId);
}

async function _loadCommentsForModal(cardId) {
  const commentList = document.getElementById('comment-list');
  if (!commentList) return;
  
  // Cache current user ID for delete button visibility
  await _cacheOwnUserId();
  
  if (await _isApiMode()) {
    try {
      const user = await getCurrentUser();
      const data = await AwardAPI.getAwardData(cardId, user.userId);
      if (data && data.comments) {
        _renderComments(commentList, data.comments, true);
        return;
      }
    } catch (e) {
      console.warn('[showCommentsModal] API failed, falling back to localStorage', e);
    }
  }
  
  // localStorage fallback
  const comments = _lsGetComments(cardId);
  _renderComments(commentList, comments, false);
}

function _renderComments(container, comments, isApiMode) {
  if (!comments || comments.length === 0) {
    container.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
    return;
  }
  container.innerHTML = comments.map(c => {
    const author = isApiMode ? (c.username || '') : (c.author || '');
    const text = isApiMode ? c.content : c.text;
    const dateStr = isApiMode
      ? (c.created_at ? new Date(c.created_at).toLocaleDateString() : '')
      : new Date(c.timestamp).toLocaleDateString();
    const commentId = isApiMode ? (c._id || c.id || '') : '';
    const isOwn = isApiMode ? _isOwnComment(c) : true;
    return `
      <div class="comment-item" data-comment-id="${commentId}">
        ${author ? `<div class="comment-author">${author}</div>` : ''}
        <div class="comment-text">${text}</div>
        <div class="comment-date">${dateStr}</div>
        ${isOwn ? `<button class="comment-delete-btn" onclick="deleteComment(this, '${commentId}')" title="Delete comment">✕</button>` : ''}
      </div>
    `;
  }).join('');
}



// Check if comment belongs to current user
// Note: This is synchronous but caches the result; _renderComments is called after auth
let _ownUserId = null;
async function _cacheOwnUserId() {
  if (_ownUserId) return;
  try {
    const user = await getCurrentUser();
    if (user && user.userId) _ownUserId = user.userId;
  } catch (e) {}
}
function _isOwnComment(commentObj) {
  if (!_ownUserId) return false;
  const commentUserId = commentObj.user_id || commentObj.userId || '';
  return commentUserId === _ownUserId;
}

// Delete a comment
async function deleteComment(btnEl, commentId) {
  const modal = document.getElementById('comments-modal');
  const cardId = modal ? modal.dataset.cardId : '';
  
  // Confirm before delete
  if (!confirm('Delete this comment?')) return;
  
  // If no commentId (localStorage mode), remove from DOM directly
  if (!commentId) {
    const commentItem = btnEl.closest('.comment-item');
    if (commentItem) commentItem.remove();
    return;
  }
  
  try {
    if (await _isApiMode()) {
      const user = await getCurrentUser();
      console.log('[deleteComment] user:', JSON.stringify(user));
      const userId = user?.userId || user?.open_id || user?.id || user?.user_id || '';
      if (!userId) {
        alert('Cannot delete: user identity not available. Please refresh and try again.');
        return;
      }
      // Show deleting state
      const commentItem = btnEl.closest('.comment-item');
      btnEl.textContent = '...';
      btnEl.disabled = true;
      
      const deleteUrl = `https://da1e5fb0.aipa.bytedance.net/api/comment/${commentId}?user_id=${encodeURIComponent(userId)}`;
      console.log('[deleteComment] DELETE', deleteUrl);
      
      const res = await fetch(deleteUrl, { method: 'DELETE' });
      const resText = await res.text().catch(() => '');
      console.log('[deleteComment] Response:', res.status, resText);
      
      if (res.ok) {
        // Remove deleted comment from AwardAPI cache immediately
        if (cardId && typeof AwardAPI !== 'undefined' && AwardAPI._cache[cardId]) {
          const cached = AwardAPI._cache[cardId];
          if (cached.comments) {
            cached.comments = cached.comments.filter(c => (c._id || c.id) !== commentId);
          }
        }
        // Remove from DOM directly
        if (commentItem) {
          commentItem.style.transition = 'opacity 0.3s ease';
          commentItem.style.opacity = '0';
          setTimeout(() => {
            commentItem.remove();
            const commentList = document.getElementById('comment-list');
            if (commentList && !commentList.querySelector('.comment-item')) {
              commentList.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
            }
          }, 300);
        }
      } else {
        alert('Delete failed (' + res.status + '): ' + resText);
        btnEl.textContent = '✕';
        btnEl.disabled = false;
      }
    } else {
      // localStorage fallback - remove from DOM
      const commentItem = btnEl.closest('.comment-item');
      if (commentItem) commentItem.remove();
    }
  } catch (e) {
    console.error('[deleteComment] Error:', e);
  }
}

async function submitComment() {
  const modal = document.getElementById('comments-modal');
  const commentInput = document.getElementById('comment-input');
  const commentList = document.getElementById('comment-list');
  
  if (!modal || !commentInput) return;
  
  const text = commentInput.value.trim();
  if (!text) return;
  
  const cardId = modal.dataset.cardId;
  
  if (await _isApiMode()) {
    try {
      const user = await getCurrentUser();
      const result = await AwardAPI.addComment(cardId, user.userId, user.username, text);
      if (result) {
        commentInput.value = '';
        // Refresh the full comment list from API
        await _loadCommentsForModal(cardId);
        // Update comment count on card if visible
        _updateCommentCountOnCard(cardId);
        return;
      } else {
        console.error('[submitComment] addComment returned null - API may have failed');
        alert('Comment failed to post. Please try again.');
        return;
      }
    } catch (e) {
      console.warn('[submitComment] API failed:', e);
      alert('Comment failed to post: ' + e.message);
      return;
    }
  }
  
  // localStorage fallback
  const comments = _lsGetComments(cardId);
  
  comments.push({
    text: text,
    author: 'You',
    timestamp: Date.now()
  });
  
  _lsSetComments(cardId, comments);
  commentInput.value = '';
  
  // Update display
  if (comments.length === 1) {
    commentList.innerHTML = '';
  }
  commentList.innerHTML += `
    <div class="comment-item">
      <div class="comment-author">You</div>
      <div class="comment-text">${text}</div>
      <div class="comment-date">Just now</div>
    </div>
  `;
}

// Update comment count badge on a card
function _updateCommentCountOnCard(cardId) {
  const commentBtn = document.querySelector(`[data-card-id="${cardId}"] .comment-btn`);
  // Currently the UI just shows "💬 Comment" without a count
  // This is a placeholder if we want to add count display later
}

// ==================== Batch Load Interactions ====================
/**
 * After cards are rendered, batch load all like/comment data from API
 * and update the UI. Call this after renderGlobalAwards or renderRegionalAwards.
 */
async function loadAllCardInteractions() {
  // Check API availability first
  if (!(await _isApiMode())) {
    // In localStorage fallback mode, no batch loading needed
    // Cards already show correct localStorage state via getLikeCount
    return;
  }
  
  const user = await getCurrentUser();
  const cards = document.querySelectorAll('[data-card-id]');
  if (cards.length === 0) return;
  
  const awardIds = [];
  cards.forEach(card => {
    awardIds.push(card.dataset.cardId);
  });
  
  try {
    const dataMap = await AwardAPI.batchGetAwardData(awardIds, user.userId);
    
    // Update each card's UI
    for (const [awardId, data] of Object.entries(dataMap)) {
      if (data) {
        updateLikeDisplay(awardId, data.liked, data.like_count);
      }
    }
  } catch (e) {
    console.error('[loadAllCardInteractions] Failed to load interactions:', e);
  }
}

function closeCommentsModal() {
  const modal = document.getElementById('comments-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==================== Share/Poster Functions ====================

// ==================== Share Modal Functions ====================
function showShareModalFromBtn(btn) {
  const projectName = btn.dataset.project;
  const teamAward = btn.dataset.award;
  const bonus = btn.dataset.bonus;
  const reason = btn.dataset.reason;
  const members = JSON.parse(btn.dataset.members || '[]');
  showShareModal(projectName, teamAward, bonus, reason, members);
}

function showShareModal(projectName, teamAward, bonus, reason, members) {
  console.log('showShareModal called:', { projectName, teamAward, bonus });
  
  const modal = document.getElementById('share-modal');
  const modalTitle = document.getElementById('share-modal-title');
  const posterPreview = document.getElementById('poster-preview');
  
  if (!modal) {
    console.error('Share modal not found');
    return;
  }
  
  modalTitle.textContent = 'Share Award';
  
  // Add preview hint above poster
  
  // Format members list - grid layout with individual items
  let memberList;
  let membersClass = 'poster-members';
  if (Array.isArray(members)) {
    const names = members.map(m => m.name || m);
    // >40 people: 5 columns, 13px; <=40 people: 3 columns, 17px
    if (names.length > 40) {
      membersClass += ' members-compact';
    }
    memberList = names.map(name => `<div class="poster-member-item">${name}</div>`).join(' ');
  } else {
    memberList = members;
  }
  
  const currentYear = (typeof AppData !== 'undefined' && AppData.currentYear) ? AppData.currentYear : '2025';
  
  // Shopping bag icon base64 data URI
  const SHOPPING_BAG_ICON = 'data:image/png;base64,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';
  
  // Generate poster HTML - certificate style layout
  // Auto-adjust for long content
  const posterSizeClass = (reason && reason.length > 1500) ? 'poster-long-content' : '';
  
  posterPreview.innerHTML = `
    <div class="poster-container ${posterSizeClass}" id="poster-content">
      <div class="poster-gradient"></div>
      <div class="poster-header">
        <div class="poster-brand">Global E-commerce Recognition Hub</div>
      </div>
      <div class="poster-divider"></div>
      <div class="poster-center">
        <div class="poster-award-type">${teamAward || 'Global Excellence Award'}</div>
        <div class="poster-project-name">${projectName}</div>
        <div class="poster-bonus">${formatCurrency(bonus)}</div>
        <div class="poster-bonus-label">Award Bonus</div>
      </div>
      <div class="poster-body">
        <div class="poster-reason-section">
          <div class="poster-section-label">Project Highlights</div>
          <div class="poster-reason">${reason || 'Outstanding contribution to the team'}</div>
        </div>
        <div class="poster-members-section">
          <div class="poster-section-label">Team Members</div>
          <div class="${membersClass}">
            ${memberList}
          </div>
        </div>
      </div>
      <img class="poster-corner-icon" src="${SHOPPING_BAG_ICON}" />
      <div class="poster-footer">
        <div class="poster-footer-line"></div>
        <div class="poster-brand-footer">TikTok Shop</div>
      </div>
    </div>
  `;
  
  // Show modal FIRST so the browser computes layout (scrollHeight is 0 when display:none)
  modal.classList.add('active');
  
  // Now measure and scale the poster preview
  const preview = document.getElementById('poster-preview');
  const posterEl = preview ? preview.querySelector('.poster-container') : null;
  if (posterEl && preview) {
    const modalContent = modal.querySelector('.modal-content');
    const availableWidth = modalContent ? Math.min(modalContent.clientWidth - 48, 652) : 652;
    const scale = availableWidth / 2560;
    
    // Reset transform to measure true dimensions
    posterEl.style.transform = 'none';
    posterEl.style.width = '2560px';
    
    // Force reflow
    void posterEl.offsetHeight;
    
    const actualHeight = posterEl.scrollHeight;
    const scaledHeight = Math.ceil(actualHeight * scale);
    
    // Apply scale
    posterEl.style.transform = 'scale(' + scale + ')';
    posterEl.style.transformOrigin = 'top left';
    
    // Set preview container to match scaled poster dimensions
    const maxPreviewH = Math.floor(window.innerHeight * 0.55);
    const displayHeight = Math.min(scaledHeight, maxPreviewH);
    preview.style.height = displayHeight + 'px';
    preview.style.width = availableWidth + 'px';
    preview.style.position = 'relative';
    preview.style.overflow = scaledHeight > maxPreviewH ? 'auto' : 'hidden';
    preview.style.margin = '0 auto';
    preview.style.display = 'block';
  }
}

function closeShareModal() {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

async function downloadPoster() {
  const posterContent = document.getElementById('poster-content');
  if (!posterContent) {
    alert('Poster content not found');
    return;
  }
  
  try {
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      // Try loading dynamically
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Temporarily remove transform for accurate html2canvas capture
    const savedTransform = posterContent.style.transform;
    const savedTransformOrigin = posterContent.style.transformOrigin;
    posterContent.style.transform = 'none';
    posterContent.style.transformOrigin = 'top left';

    // Use actual content height for dynamic poster
    const posterActualHeight = posterContent.scrollHeight;
    const canvas = await html2canvas(posterContent, {
      backgroundColor: '#000000',
      scale: 2,
      width: 2560,
      height: posterActualHeight,
      useCORS: true,
      logging: false,
      onclone: function(clonedDoc) {
        // Fix html2canvas z-index rendering issues
        const clonedPoster = clonedDoc.getElementById('poster-content');
        if (clonedPoster) {
          // Remove pseudo-element borders (html2canvas renders them on top of text)
          clonedPoster.classList.add('poster-no-decorations');
          // Ensure gradient stays behind text
          const gradient = clonedPoster.querySelector('.poster-gradient');
          if (gradient) {
            gradient.style.zIndex = '-1';
          }
          // Ensure all text elements are above overlays
          clonedPoster.querySelectorAll('.poster-header, .poster-center, .poster-body, .poster-footer, .poster-divider, .poster-corner-icon').forEach(function(el) {
            el.style.position = 'relative';
            el.style.zIndex = '10';
          });
        }
      }
    });

    // Restore transform for preview
    posterContent.style.transform = savedTransform;
    posterContent.style.transformOrigin = savedTransformOrigin;
    
    // Convert to image and download
    const link = document.createElement('a');
    link.download = 'award-poster.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error generating poster:', error);
    alert('Failed to generate poster. Please try again.');
  }
}

// ==================== Global Page Functions ====================
function renderGlobalAwards(data, containerId, half) {
  const container = document.getElementById(containerId);
  if (!container || !data) {
    console.error('renderGlobalAwards: missing container or data', { container: !!container, data: !!data });
    return;
  }
  
  console.log('renderGlobalAwards called:', { half, hasH1: !!data['H1 Project Awards'], hasH2: !!data['H2 Project Awards'], h2Count: (data['H2 Project Awards'] || []).length });
  
  let awards = [];
  if (half === 'H1') {
    awards = getH1ProjectAwards(data);
  } else {
    awards = getH2ProjectAwards(data);
  }
  
  console.log('Awards fetched:', awards.length, 'for half:', half);
  
  if (awards.length === 0) {
    container.innerHTML = '<div class="no-data-msg">No awards available for this period</div>';
    return;
  }
  
  // Group by project name
  const projectGroups = {};
  awards.forEach(award => {
    const key = award.project_name;
    if (!projectGroups[key]) {
      projectGroups[key] = {
        project_name: award.project_name,
        team_award: award.team_award,
        bonus: award.bonus,
        reason: award.reason,
        members: [],
        department: award.department,
        period: award.period,
        project_english_name: award.project_english_name
      };
    }
    award.members.forEach(m => {
      if (!projectGroups[key].members.find(mem => mem.name === m)) {
        projectGroups[key].members.push({ name: m, email: award.email });
      }
    });
  });
  
  console.log('Project groups:', Object.keys(projectGroups));
  
  let html = '<div class="awards-grid">';
  
  Object.values(projectGroups).forEach(project => {
    const cardId = `global_${project.project_name.replace(/\s+/g, '_')}`;
    const likeCount = getLikeCount(cardId);
    const reasonText = project.reason || '';
    
    // Handle award name display - if team_award is "Yes" or empty, show default
    const awardName = (project.team_award && project.team_award !== 'Yes' && project.team_award !== 'true') 
      ? project.team_award 
      : 'Global E-commerce Impactful Projects';
    
    html += `
      <div class="card project-card" data-card-id="${cardId}">
        <div class="card-header">
          <span class="card-icon">🏆</span>
          <span class="card-title">${project.project_english_name || project.project_name}</span>
        </div>
        <div class="card-body">
          <div class="card-period">${half}</div>
          <div class="card-award">
            <span class="card-award-name">🏆 ${awardName}</span>
          </div>
          <div class="card-amount">${formatCurrency(project.bonus)}</div>
          <div class="card-reason-scroll">
            ${reasonText}
          </div>
        </div>
        <div class="card-footer">
          <button class="members-btn" onclick="showMembersModal('${project.project_name.replace(/'/g, "\\'")}', ${JSON.stringify(project.members).replace(/"/g, '&quot;')})">
            Team Members (${project.members.length})
          </button>
          <div class="card-actions">
            <button class="like-btn ${likeCount > 0 ? 'liked' : ''}" onclick="toggleLike('${cardId}', 'global_project', '${project.project_name.replace(/'/g, "\\'")}')">
              ❤️ <span class="like-count">${likeCount}</span>
            </button>
            <button class="comment-btn" onclick="showCommentsModal('${cardId}', '${project.project_name.replace(/'/g, "\\'")}', 'Global Project Award')">
              💬 Comment
            </button>
            <button class="share-btn" data-project="${project.project_name.replace(/'/g, "\\'")}" data-award="${awardName}" data-bonus="${project.bonus || ''}" data-reason="${(reasonText || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}" data-members='${JSON.stringify(project.members).replace(/'/g, "&#39;")}' onclick="showShareModalFromBtn(this)">
              📤 Share
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// ==================== Regional Page Functions ====================
function renderRegionalAwards(data, containerId, period, region) {
  const container = document.getElementById(containerId);
  if (!container || !data) return;
  
  let html = '';
  const currentYear = AppData.currentYear || '2026';
  
  // Q1/Q2/Q3/Q4: 区分 FS/POP (项目奖) 和 LATAM (个人奖)
  if (['Q1', 'Q2', 'Q3', 'Q4'].includes(period)) {
    const isQuarterProjectRegion = region === 'fs' || region === 'pop';
    
    if (isQuarterProjectRegion) {
      // FS/POP: 显示季度项目奖
      const quarterKey = `${period} Project Awards`;
      const quarterAwards = data[quarterKey] || [];
      if (quarterAwards.length === 0) {
        html = `<div class="no-data-msg">No ${period} project awards available</div>`;
      } else {
        html = renderProjectCards(quarterAwards, region, period);
      }
    } else {
      // LATAM: 显示季度个人奖
      const quarterAwards = getIndividualAwardsByQuarter(data, period);
      if (quarterAwards.length === 0) {
        html = `<div class="no-data-msg">No ${period} individual awards available for LATAM</div>`;
      } else {
        html = renderIndividualCards(quarterAwards, region, period);
      }
    }
  } else if (period === 'Q4 Individual Awards') {
    // FS/POP Q4 BFCM个人奖 (H2 Individual Awards)
    const individualAwards = data['H2 Individual Awards'] || [];
    if (individualAwards.length === 0) {
      html = '<div class="no-data-msg">No Q4 BFCM Stellar Contributors available</div>';
    } else {
      html = renderIndividualCards(individualAwards, region, 'Q4 BFCM');
    }
  } else if (period === 'Q1 Individual Awards') {
    // LATAM H1 individual awards (2026)
    const h1Awards = getQ1IndividualAwardsYear(data, currentYear);
    if (h1Awards.length === 0) {
      html = `<div class="no-data-msg">No H1 individual awards available for LATAM ${currentYear}</div>`;
    } else {
      html = renderIndividualCards(h1Awards, region, 'H1');
    }
  } else if (period === 'H1 Project Awards') {
    const h1Awards = getH1ProjectAwardsYear(data, currentYear);
    if (h1Awards.length === 0) {
      html = '<div class="no-data-msg">No H1 project awards available for this region</div>';
    } else {
      html = renderProjectCards(h1Awards, region, 'H1');
    }
  } else if (period === 'H2 Project Awards') {
    const h2Awards = getH2ProjectAwardsYear(data, currentYear);
    if (h2Awards.length === 0) {
      html = '<div class="no-data-msg">No H2 project awards available for this region</div>';
    } else {
      html = renderProjectCards(h2Awards, region, 'H2');
    }
  } else if (period === 'H2 Individual Awards') {
    // Non-LATAM individual awards or LATAM 2025 H2 individual
    const individualAwards = getH2IndividualAwardsYear(data, currentYear);
    if (individualAwards.length === 0) {
      html = '<div class="no-data-msg">No individual awards (Stellar Contributors) available for this region</div>';
    } else {
      html = renderIndividualCards(individualAwards, region, 'H2');
    }
  }
  
  container.innerHTML = html;
}

function renderProjectCards(awards, region, half) {
  // FS/POP 使用人民币，其他区域使用美元
  const defaultCurrency = (region === 'fs' || region === 'pop') ? 'CNY' : 'USD';
  
  const projectGroups = {};
  awards.forEach(award => {
    const key = award.project_name;
    if (!projectGroups[key]) {
      projectGroups[key] = {
        project_name: award.project_name,
        team_award: award.team_award,
        bonus: award.bonus,
        reason: award.reason,
        members: [],
        department: award.department,
        region: award.region,
        currency: award.currency || defaultCurrency
      };
    }
    award.members.forEach(m => {
      if (!projectGroups[key].members.find(mem => mem.name === m)) {
        projectGroups[key].members.push({ name: m, email: award.email });
      }
    });
  });
  
  let html = '<div class="awards-grid">';
  
  Object.values(projectGroups).forEach(project => {
    const cardId = `regional_${region}_${project.project_name.replace(/\s+/g, '_')}`;
    const likeCount = getLikeCount(cardId);
    const reasonText = project.reason || '';
    
    // Handle award name display - if team_award is "Yes" or empty, show default
    const awardName = (project.team_award && project.team_award !== 'Yes' && project.team_award !== 'true') 
      ? project.team_award 
      : 'Impactful XFN Project';
    
    html += `
      <div class="card project-card" data-card-id="${cardId}">
        <div class="card-header">
          <span class="card-icon">🏆</span>
          <span class="card-title">${project.project_english_name || project.project_name}</span>
        </div>
        <div class="card-body">
          <div class="card-period">${half}</div>
          <div class="card-award">
            <span class="card-award-name">🏆 ${awardName}</span>
          </div>
          <div class="card-amount">${formatCurrency(project.bonus, project.currency)}</div>
          <div class="card-reason-scroll">
            ${reasonText}
          </div>
        </div>
        <div class="card-footer">
          <button class="members-btn" onclick="showMembersModal('${project.project_name.replace(/'/g, "\\'")}', ${JSON.stringify(project.members).replace(/"/g, '&quot;')})">
            Team Members (${project.members.length})
          </button>
          <div class="card-actions">
            <button class="like-btn ${likeCount > 0 ? 'liked' : ''}" onclick="toggleLike('${cardId}', 'regional_project', '${project.project_name.replace(/'/g, "\\'")}')">
              ❤️ <span class="like-count">${likeCount}</span>
            </button>
            <button class="comment-btn" onclick="showCommentsModal('${cardId}', '${project.project_name.replace(/'/g, "\\'")}', 'Regional Project Award')">
              💬 Comment
            </button>
            <button class="share-btn" data-project="${project.project_name.replace(/'/g, "\\'")}" data-award="${awardName}" data-bonus="${project.bonus || ''}" data-reason="${(reasonText || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}" data-members='${JSON.stringify(project.members).replace(/'/g, "&#39;")}' onclick="showShareModalFromBtn(this)">
              📤 Share
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

function renderIndividualCards(awards, region, half) {
  // FS/POP 使用人民币，其他区域使用美元
  const defaultCurrency = (region === 'fs' || region === 'pop') ? 'CNY' : 'USD';
  
  let html = '<div class="awards-grid">';
  
  awards.forEach(award => {
    // Handle both winner_name and members array formats
    const memberNames = award.members || (award.winner_name ? [award.winner_name] : []);
    const currency = award.currency || defaultCurrency;
    
    memberNames.forEach((memberName, idx) => {
      const memberNameStr = typeof memberName === 'string' ? memberName : memberName.name;
      const cardId = `individual_${region}_${memberNameStr.replace(/\s+/g, '_')}_${idx}`;
      const likeCount = getLikeCount(cardId);
      const reasonText = award.reason || award.award_reason || '';
      const deptDisplay = award.department || award.region || region;
      
      // Determine award name based on region and department
      let awardName = award.project_name || award.team_award || 'Stellar Contributor';
      
      // For EU region, check if it's Japan-related
      if (region === 'eu' && award.project_name === 'BFCM/Tokutoku Thanks Sale Stellar Contributors') {
        const dept = (award.department || '').toLowerCase();
        if (dept.includes('jp') || dept.includes('japan')) {
          awardName = 'Tokutoku Thanks Sale Stellar Contributors';
        } else {
          awardName = 'BFCM Stellar Contributors';
        }
      }
      
      html += `
        <div class="card individual-card" data-card-id="${cardId}">
          <div class="card-header">
            <span class="card-icon">👤</span>
            <span class="card-title">${memberNameStr}</span>
          </div>
          <div class="card-meta">${deptDisplay}</div>
          <div class="card-body">
            <div class="card-award">
              <span class="card-award-name">🌟 ${awardName}</span>
            </div>
            <div class="card-amount">${formatCurrency(award.bonus, currency)}</div>
            <div class="card-reason-scroll">
              ${reasonText}
            </div>
          </div>
          <div class="card-footer">
            <div class="card-actions">
              <button class="like-btn ${likeCount > 0 ? 'liked' : ''}" onclick="toggleLike('${cardId}', 'individual', '${memberNameStr.replace(/'/g, "\\'")}')">
                ❤️ <span class="like-count">${likeCount}</span>
              </button>
              <button class="comment-btn" onclick="showCommentsModal('${cardId}', '${memberNameStr.replace(/'/g, "\\'")}', 'Individual Award')">
                💬 Comment
              </button>
              <button class="share-btn" data-project="${memberNameStr.replace(/'/g, "\\'")}" data-award="${awardName}" data-bonus="${award.bonus || ''}" data-reason="${(reasonText || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}" data-members='${JSON.stringify([{name: memberNameStr, email: award.email || ''}]).replace(/'/g, "&#39;")}' onclick="showShareModalFromBtn(this)">
                📤 Share
              </button>
            </div>
          </div>
        </div>
      `;
    });
  });
  
  html += '</div>';
  return html;
}

// ==================== Modal Functions ====================
function showMembersModal(projectName, members) {
  const modal = document.getElementById('members-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  if (!modal) return;
  
  modalTitle.textContent = projectName;
  
  let membersHtml = '<div class="members-list">';
  members.forEach(member => {
    const name = member.name || member;
    const email = member.email || '';
    membersHtml += `
      <div class="member-item">
        <div class="member-name">${name}</div>
        <div class="member-email">${email}</div>
      </div>
    `;
  });
  membersHtml += '</div>';
  
  modalBody.innerHTML = membersHtml;
  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('members-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('members-modal');
  if (e.target === modal) {
    closeModal();
  }
  const shareModal = document.getElementById('share-modal');
  if (e.target === shareModal) {
    closeShareModal();
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeShareModal();
  }
});

// ==================== Search Functions ====================
let searchData = null;
let nameMap = null;

// Unwrap year-based data structure: if data has year keys (e.g. {2025: {...}, 2026: {...}}), extract the target year; otherwise return as-is
function unwrapYearData(data, year) {
    if (!data) return null;
    if (data[year]) return data[year]; // Has year structure
    return data; // No year structure, return as-is
}

// Load all search data from JSON files (renamed from initSearch to avoid override by page scripts)
async function loadSearchData() {
  try {
    const [global, us, eu, sea, latam, rankings, departmental, fs, pop, nameMapData] = await Promise.all([
      fetch('data/global.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/us.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/eu.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/sea.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/latam.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/rankings.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/departmental.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/fs.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/pop.json?v=20260601a').then(r => r.json()).catch(() => null),
      fetch('data/name-map.json?v=20260601a').then(r => r.json()).catch(() => null)
    ]);
    nameMap = nameMapData || {};
    
    const targetYear = AppData.currentYear || '2026';
    searchData = {
      global: unwrapYearData(global, targetYear),
      regional: {
        us: unwrapYearData(us, targetYear),
        eu: unwrapYearData(eu, targetYear),
        sea: unwrapYearData(sea, targetYear),
        latam: unwrapYearData(latam, targetYear)
      },
      rankings: unwrapYearData(rankings, targetYear),
      departmental: unwrapYearData(departmental, targetYear),
      fs: unwrapYearData(fs, targetYear),
      pop: unwrapYearData(pop, targetYear)
    };
    console.log("[Search] Data loaded successfully - global:", !!searchData.global, "H1 count:", searchData.global?.['H1 Project Awards']?.length, "H2 count:", searchData.global?.['H2 Project Awards']?.length);
  } catch (error) {
    console.error('Error loading search data:', error);
  }
}

// Hybrid matching: CJK uses substring, English uses word-boundary
// Also supports Chinese->English cross-lookup via nameMap
function matchesWord(text, searchTerm) {
  if (!text) return false;
  var lower = text.toLowerCase();
  var term = searchTerm.toLowerCase();
  // CJK: substring match + nameMap cross-lookup
  if (/[一-鿿぀-ゟ゠-ヿ]/.test(term)) {
    if (lower.includes(term)) return true;
    // Check if searchTerm matches any Chinese name in nameMap, then also match the English name
    if (nameMap) {
      for (var cn in nameMap) {
        if (cn.includes(term) || term.includes(cn)) {
          var en = nameMap[cn].toLowerCase();
          if (lower.includes(en)) return true;
        }
      }
    }
    return false;
  }
  // Non-CJK: word-boundary match
  var escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var regex = new RegExp('(^|[\\s,;:\\-/_|.()\\[\\]{}])' + escaped + '($|[\\s,;:\\-/_|.()\\[\\]{}])', 'i');
  return regex.test(lower) || lower === term;
}

function performSearch(query, level = 'all') {
  if (!query || !searchData) return [];
  
  const results = [];
  const seenProjectNames = new Set(); // for dedup by project_name
  const searchTerm = query.toLowerCase().trim();
  
  // Match source weights: 1=project name (highest), 2=department, 3=member, 4=reason (lowest)
  function getMatchSource(matchName, matchDept, matchMember, matchReason) {
    let source = Infinity;
    if (matchName) source = Math.min(source, 1);
    if (matchDept) source = Math.min(source, 2);
    if (matchMember) source = Math.min(source, 3);
    if (matchReason) source = Math.min(source, 4);
    return source === Infinity ? 4 : source;
  }
  
  // Search Global awards (level: 'global' or 'all')
  if (searchData.global && (level === 'all' || level === 'global')) {
    const h1Awards = searchData.global['H1 Project Awards'] || [];
    const h2Awards = searchData.global['H2 Project Awards'] || [];
    const allGlobalAwards = [...h1Awards, ...h2Awards];
    
    allGlobalAwards.forEach(award => {
      const matchName = matchesWord(award.project_name, searchTerm);
      const matchMember = award.members?.some(m => matchesWord(m, searchTerm));
      
      if (matchName || matchMember) {
        const dedupKey = `global|${award.project_name}`;
        if (!seenProjectNames.has(dedupKey)) {
          seenProjectNames.add(dedupKey);
          // Find matched members
          const matchedMembers = matchMember ? award.members?.filter(m => matchesWord(m, searchTerm)) || [] : [];
          results.push({
            type: 'Project Award',
            level: 'Global',
            period: award.period || 'H1/H2',
            name: award.project_name,
            award: award.team_award,
            members: award.members,
            department: award.department,
            email: award.email || '',
            reason: award.reason,
            matchSource: getMatchSource(matchName, false, matchMember, false),
            matchedMembers: matchedMembers,
            memberCount: award.members?.length || 0
          });
        }
      }
    });
  }
  
  // Search Regional awards (level: 'regional' or 'all')
  if (level === 'all' || level === 'regional') {
    ['us', 'eu', 'sea', 'latam'].forEach(region => {
      const data = searchData.regional[region];
      if (!data) return;
      
      const h1Awards = data['H1 Project Awards'] || [];
      const h2Awards = data['H2 Project Awards'] || [];
      const allRegionalAwards = [...h1Awards, ...h2Awards];
      
      allRegionalAwards.forEach(award => {
        const matchName = matchesWord(award.project_name, searchTerm);
        const matchMember = award.members?.some(m => matchesWord(m, searchTerm));
        
        if (matchName || matchMember) {
          const dedupKey = `regional-${region}|${award.project_name}`;
          if (!seenProjectNames.has(dedupKey)) {
            seenProjectNames.add(dedupKey);
            const matchedMembers = matchMember ? award.members?.filter(m => matchesWord(m, searchTerm)) || [] : [];
            results.push({
              type: 'Project Award',
              level: `Regional - ${region.toUpperCase()}`,
              period: award.period || 'H1/H2',
              name: award.project_name,
              award: award.team_award,
              members: award.members,
              department: award.department,
              email: award.email || '',
              matchSource: getMatchSource(matchName, false, matchMember, false),
              matchedMembers: matchedMembers,
              memberCount: award.members?.length || 0
            });
          }
        }
      });
      
      const individualAwards = data['H2 Individual Awards'] || [];
      individualAwards.forEach(award => {
        if (award.winner_name) {
          const matchName = matchesWord(award.winner_name, searchTerm);
          
          if (matchName) {
            results.push({
              type: 'Individual Award',
              level: `Regional - ${region.toUpperCase()}`,
              name: award.winner_name,
              award: award.team_award,
              department: award.department,
              email: award.email || '',
              matchSource: getMatchSource(matchName, false, false, false)
            });
          }
        }
      });
    });
  }
  
  // Search Rankings (only when level is 'all')
  if (level === 'all' && searchData.rankings) {
    Object.keys(searchData.rankings).forEach(key => {
      const items = searchData.rankings[key];
      if (!Array.isArray(items)) return;
      items.forEach(r => {
        const matchName = matchesWord(r.name, searchTerm);
        if (matchName) {
          results.push({
            type: 'Top Performer',
            level: `Rank #${r.rank || (items.indexOf(r) + 1)}`,
            name: r.name,
            points: r.points,
            department: r.department || r.region || '',
            email: r.email || '',
            matchSource: getMatchSource(matchName, false, false, false)
          });
        }
      });
    });
  }
  
  // Search Departmental awards (level: 'departmental' or 'all')
  if (searchData.departmental && (level === 'all' || level === 'departmental')) {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    quarters.forEach(q => {
      const awards = searchData.departmental[q] || [];
      awards.forEach(award => {
        const matchName = matchesWord(award.winner_name, searchTerm);
        const matchMember = award.members?.some(m => matchesWord(typeof m === 'string' ? m : m.name || '', searchTerm));
        
        if (matchName || matchMember) {
          const dedupKey = `dept|${q}|${award.winner_name}|${award.department}`;
          if (!seenProjectNames.has(dedupKey)) {
            seenProjectNames.add(dedupKey);
            const matchedMembers = matchMember ? award.members?.filter(m => matchesWord(typeof m === 'string' ? m : m.name || '', searchTerm)) || [] : [];
            results.push({
              type: award.award_type || 'Departmental Award',
              level: 'Departmental',
              period: q,
              name: award.winner_name,
              award: award.award_type,
              members: award.members,
              department: award.department,
              email: award.email || '',
              matchSource: getMatchSource(matchName, false, matchMember, false),
              matchedMembers: matchedMembers,
              memberCount: award.members?.length || 0
            });
          }
        }
      });
    });
  }
  

  // Search FS awards
  if (searchData.fs && (level === 'all' || level === 'fs')) {
    const quarters = ['Q1 Project Awards', 'Q2 Project Awards', 'Q3 Project Awards', 'Q4 Project Awards'];
    quarters.forEach(q => {
      const awards = searchData.fs[q] || [];
      awards.forEach(award => {
        const matchName = matchesWord(award.project_name, searchTerm);
        const matchMember = award.members?.some(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm));
        if (matchName || matchMember) {
          const dedupKey = `fs|${q}|${award.project_name}`;
          if (!seenProjectNames.has(dedupKey)) {
            seenProjectNames.add(dedupKey);
            const matchedMembers = matchMember ? award.members?.filter(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm)) || [] : [];
            results.push({
              type: award.award_type || 'Project Award',
              level: 'FS',
              period: award.period || q,
              name: award.project_name,
              award: award.team_award,
              members: award.members,
              department: award.department,
              email: award.email || '',
              reason: award.reason,
              matchSource: getMatchSource(matchName, false, matchMember, false),
              matchedMembers: matchedMembers,
              memberCount: award.members?.length || 0
            });
          }
        }
      });
    });
    const fsIndividual = searchData.fs['H2 Individual Awards'] || [];
    fsIndividual.forEach(award => {
      const matchName = matchesWord(award.winner_name, searchTerm);
      const matchMember = award.members?.some(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm));
      if (matchName || matchMember) {
        results.push({
          type: 'Individual Award',
          level: 'FS',
          period: award.period || 'H2',
          name: award.winner_name || award.project_name,
          award: award.team_award,
          department: award.department,
          email: award.email || '',
          matchSource: getMatchSource(matchName, false, matchMember, false),
          matchedMembers: matchMember ? award.members?.filter(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm)) || [] : []
        });
      }
    });
  }

  // Search POP awards
  if (searchData.pop && (level === 'all' || level === 'pop')) {
    const quarters = ['Q1 Project Awards', 'Q2 Project Awards', 'Q3 Project Awards', 'Q4 Project Awards'];
    quarters.forEach(q => {
      const awards = searchData.pop[q] || [];
      awards.forEach(award => {
        const matchName = matchesWord(award.project_name, searchTerm);
        const matchMember = award.members?.some(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm));
        if (matchName || matchMember) {
          const dedupKey = `pop|${q}|${award.project_name}`;
          if (!seenProjectNames.has(dedupKey)) {
            seenProjectNames.add(dedupKey);
            const matchedMembers = matchMember ? award.members?.filter(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm)) || [] : [];
            results.push({
              type: award.award_type || 'Project Award',
              level: 'POP',
              period: award.period || q,
              name: award.project_name,
              award: award.team_award,
              members: award.members,
              department: award.department,
              email: award.email || '',
              reason: award.reason,
              matchSource: getMatchSource(matchName, false, matchMember, false),
              matchedMembers: matchedMembers,
              memberCount: award.members?.length || 0
            });
          }
        }
      });
    });
    const popIndividual = searchData.pop['H2 Individual Awards'] || [];
    popIndividual.forEach(award => {
      const matchName = matchesWord(award.winner_name, searchTerm);
      const matchMember = award.members?.some(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm));
      if (matchName || matchMember) {
        results.push({
          type: 'Individual Award',
          level: 'POP',
          period: award.period || 'H2',
          name: award.winner_name || award.project_name,
          award: award.team_award,
          department: award.department,
          email: award.email || '',
          matchSource: getMatchSource(matchName, false, matchMember, false),
          matchedMembers: matchMember ? award.members?.filter(m => matchesWord(typeof m === 'string' ? m : m.name || m, searchTerm)) || [] : []
        });
      }
    });
  }

  // Sort by matchSource (ascending: lower = higher priority)
  results.sort((a, b) => a.matchSource - b.matchSource);
  
  return results;
}

function renderSearchResults(results, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }
  
  let html = '';
  results.slice(0, 20).forEach(result => {
    // For member-matched results, show only matched members + total team size
    let memberLine = '';
    if (result.matchSource === 3 && result.matchedMembers && result.matchedMembers.length > 0) {
      const matchedNames = result.matchedMembers.map(m => typeof m === 'string' ? m : m.name || '').join(', ');
      const total = result.memberCount || (result.members?.length || 0);
      memberLine = `<div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">👤 ${matchedNames}${total > result.matchedMembers.length ? ` (team of ${total})` : ''}</div>`;
    }
    html += `
      <div class="search-result-item">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="background: var(--primary-color); padding: 2px 8px; border-radius: 4px; font-size: 12px;">
            ${result.type}
          </span>
          <span style="color: var(--text-secondary); font-size: 12px;">${result.level}</span>
          ${result.period ? `<span style="color: var(--accent-color); font-size: 11px;">${result.period}</span>` : ''}
        </div>
        <div style="font-weight: 600; margin-bottom: 4px;">${result.name}</div>
        <div style="color: var(--accent-color); font-size: 14px;">${result.award || (result.points ? result.points + ' pts' : '')}</div>
        ${result.email ? `<div style="color: var(--text-secondary); font-size: 11px;">✉ ${result.email}</div>` : ''}
        ${memberLine}
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// ==================== Initialize ====================
const isHomePage = document.getElementById('top3-podium');

if (isHomePage) {
  console.log('Home page detected - using page-specific initialization');
} else {
  document.addEventListener('DOMContentLoaded', () => {
    // Apply language to all UI elements
    // language applied (English only)
    
    highlightNavigation();
    initYearNavigation();
    initRegionNavigation();
    initDeptNavigation();
    // Load search data on every page (page scripts bind their own listeners)
    loadSearchData();
  });
}
