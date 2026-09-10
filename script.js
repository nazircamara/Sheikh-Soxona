const audioEnhancer = () => {
  const audios = document.querySelectorAll('audio[controls]:not([data-enhanced="true"])');

  audios.forEach((audio, index) => {
    const listItem = audio.closest('li');
    const labelCandidate = listItem?.previousElementSibling?.matches('label')
      ? listItem.previousElementSibling.textContent.trim()
      : listItem?.querySelector('[data-audio-title]')?.textContent?.trim();
    const label = labelCandidate || '';
    const source = audio.getAttribute('src') || '';
    const disabled = !source || source === '#';

    const player = document.createElement('article');
    player.className = 'audio-player';
    player.innerHTML = `
        <div class="audio-player__header">
          <div>
            <h3 class="audio-player__title">${label}</h3>
          </div>
        </div>
        <div class="audio-player__controls">
          <div class="audio-player__meta">
            <button class="audio-player__toggle" type="button" aria-label="تشغيل المقطع">
              <span aria-hidden="true">▶</span>
            </button>
          </div>
          <div class="audio-player__timeline">
            <input class="audio-player__progress" type="range" min="0" max="100" value="0" aria-label="تقدم التشغيل">
            <span data-current>00:00</span>
            <span data-duration>00:00</span>
          </div>
        </div>
    `;

    audio.classList.add('audio-player__native');
    audio.dataset.enhanced = 'true';
    audio.setAttribute('preload', 'metadata');

    const toggle = player.querySelector('.audio-player__toggle');
    const progress = player.querySelector('.audio-player__progress');
    const currentTime = player.querySelector('[data-current]');
    const durationTime = player.querySelector('[data-duration]');

    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds)) return '00:00';
      const totalSeconds = Math.max(0, Math.floor(seconds));
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const secs = String(totalSeconds % 60).padStart(2, '0');
      return `${minutes}:${secs}`;
    };

    const setPlayingState = () => {
      player.classList.toggle('is-playing', !audio.paused);
      toggle.setAttribute('aria-label', audio.paused ? 'تشغيل المقطع' : 'إيقاف المقطع');
      toggle.innerHTML = audio.paused ? '<span aria-hidden="true">▶</span>' : '<span aria-hidden="true">❚❚</span>';
    };

    const syncProgress = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      progress.value = String((audio.currentTime / audio.duration) * 100);
      currentTime.textContent = formatTime(audio.currentTime);
      durationTime.textContent = formatTime(audio.duration);
    };

    toggle.addEventListener('click', () => {
      if (disabled) return;
      if (audio.paused) {
        document.querySelectorAll('audio[data-enhanced="true"]').forEach((otherAudio) => {
          if (otherAudio !== audio) otherAudio.pause();
        });
        audio.play();
      } else {
        audio.pause();
      }
    });

    progress.addEventListener('input', () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (Number(progress.value) / 100) * audio.duration;
    });

    audio.addEventListener('loadedmetadata', syncProgress);
    audio.addEventListener('timeupdate', syncProgress);
    audio.addEventListener('play', setPlayingState);
    audio.addEventListener('pause', setPlayingState);
    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      setPlayingState();
      syncProgress();
    });

    setPlayingState();
    if (disabled) {
      player.classList.add('is-disabled');
      toggle.disabled = true;
    }

    audio.insertAdjacentElement('beforebegin', player);
    player.querySelector('.audio-player__timeline').insertAdjacentElement('beforebegin', audio);
  });
};

const normalizeSearchText = (value = '') => String(value)
  .normalize('NFKD')
  .replace(/[-]/g, '')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')
  .replace(/ى/g, 'ي')
  .replace(/[^\w\u0600-\u06FF\s]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const setupHomeSearch = (options) => {
  const searchForm = document.querySelector('.home-search__form, .search-widget, .portal-search');

  if (!searchForm) {
    return;
  }

  const searchInput = searchForm.querySelector('.search-widget__field input, .portal-search__field input, .home-search__field input');
  const searchBtn = searchForm.querySelector('.search-widget__actions button.primary, .portal-search__actions button.primary, .home-search__submit, button.primary[type="submit"]');

  if (!searchInput) {
    return;
  }

  const { categoryPanels, showPanelCallback, getCurrentActivePanelId } = options;
  const accordionItems = [...document.querySelectorAll('.custom-accordion .accordion-item')];

  let noResultsEl = document.querySelector('.search-no-results');

  if (!noResultsEl) {
    noResultsEl = document.createElement('div');
    noResultsEl.className = 'search-no-results';
    noResultsEl.setAttribute('aria-live', 'polite');
    noResultsEl.hidden = true;
    noResultsEl.style.cssText = 'margin: 1rem auto 0; padding: 1rem 1.25rem; max-width: 100%; border-radius: 16px; background: rgba(255, 255, 255, 0.94); border: 1px solid rgba(27, 67, 50, 0.16); color: #1b4332; font-weight: 700; text-align: center; box-shadow: 0 10px 24px rgba(8, 28, 21, 0.08);';
    searchForm.insertAdjacentElement('afterend', noResultsEl);
  }

  const setCollapseState = (item, isOpen) => {
    const collapseEl = item.querySelector('.accordion-collapse');
    const buttonEl = item.querySelector('.accordion-button');

    if (collapseEl) {
      collapseEl.classList.toggle('show', isOpen);
      collapseEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    if (buttonEl) {
      buttonEl.classList.toggle('collapsed', !isOpen);
      buttonEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  };

  const resetView = () => {
    noResultsEl.hidden = true;

    // Hide all panels first
    categoryPanels.forEach((panel) => {
      panel.classList.remove('is-visible');
    });

    // Restore the previously active panel
    const lastActivePanelId = getCurrentActivePanelId();
    if (lastActivePanelId) {
      showPanelCallback(lastActivePanelId);
    }

    accordionItems.forEach((item) => {
      item.style.display = '';
      item.classList.remove('is-search-match');
      item.querySelectorAll('.audio-list li').forEach((track) => {
        track.style.display = '';
        track.classList.remove('is-search-match');
      });
      setCollapseState(item, false);
    });
  };

  const performSearch = () => {
    const query = normalizeSearchText(searchInput.value);

    if (!query) {
      resetView();
      return;
    }

    let totalMatches = 0;

    categoryPanels.forEach((panel) => {
      const panelTitle = normalizeSearchText(panel.querySelector('.section-header h2, .section-title, h1, h2')?.textContent || '');
      const accordionList = [...panel.querySelectorAll('.custom-accordion .accordion-item')];
      const tileList = [...panel.querySelectorAll('.scholar-tile, .category-card, .lesson-card')];
      let panelMatches = panelTitle.includes(query);

      panel.classList.remove('is-visible');

      if (accordionList.length) {
        accordionList.forEach((item) => {
          const bookTitle = normalizeSearchText(item.querySelector('.accordion-button')?.textContent || '');
          const audioTracks = [...item.querySelectorAll('.audio-list li')];
          const bookMatches = panelTitle.includes(query) || bookTitle.includes(query);

          if (bookMatches) {
            item.style.display = '';
            item.classList.add('is-search-match');
            audioTracks.forEach((track) => {
              track.style.display = '';
              track.classList.add('is-search-match');
            });
            setCollapseState(item, true);
            panelMatches = true;
            return;
          }

          let itemHasMatch = false;

          audioTracks.forEach((track) => {
            const trackTitle = normalizeSearchText(track.querySelector('.audio-title, label')?.textContent || track.textContent || '');
            const trackMatches = trackTitle.includes(query);

            track.style.display = trackMatches ? '' : 'none';
            track.classList.toggle('is-search-match', trackMatches);

            if (trackMatches) {
              itemHasMatch = true;
            }
          });

          item.style.display = itemHasMatch ? '' : 'none';
          item.classList.toggle('is-search-match', itemHasMatch);
          setCollapseState(item, itemHasMatch);

          if (itemHasMatch) {
            panelMatches = true;
          }
        });
      } else if (tileList.length) {
        let tileMatches = false;

        tileList.forEach((tile) => {
          const tileMatchesQuery = panelTitle.includes(query) || normalizeSearchText(tile.textContent || '').includes(query);

          tile.style.display = tileMatchesQuery ? '' : 'none';
          tile.classList.toggle('is-search-match', tileMatchesQuery);

          if (tileMatchesQuery) {
            tileMatches = true;
          }
        });

        panelMatches = panelMatches || tileMatches;
      } else {
        panelMatches = panelMatches || normalizeSearchText(panel.textContent || '').includes(query);
      }

      if (panelMatches) {
        panel.classList.add('is-visible');
        totalMatches += 1;
      }
    });

    noResultsEl.hidden = totalMatches > 0;
  };

  searchInput.addEventListener('input', performSearch);
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    performSearch();
  });

  searchBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    performSearch();
  });
};

class MainHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="portal-header">
        <div class="portal-header__utility" style="background: linear-gradient(90deg, #081c15, #1b4332); color: rgba(255, 255, 255, 0.96); border-bottom: 1px solid rgba(82, 183, 136, 0.16);">
          <div class="container-xl portal-header__utility-inner">
            <div class="portal-header__ticker" aria-label="أخبار سريعة">
              <span class="portal-header__ticker-label">آخر التحديثات</span>
              <span class="portal-header__ticker-text">جديد الدروس الصوتية، تحديث فهرس الكتب، وتحسينات خاصة بالعرض العربي RTL</span>
            </div>
            <div class="portal-header__social">
              <a href="https://www.youtube.com/@nazircamara7591" target="_blank" rel="noopener noreferrer">YouTube</a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer">Twitter</a>
            </div>
          </div>
        </div>

        <div class="portal-header__brand-wrap" style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 246, 240, 0.98));">
          <div class="container-xl portal-header__brand">
            <a href="index.html" class="portal-brand" aria-label="شيخ محمد سوقونا">
              <span class="portal-brand__crest" aria-hidden="true">
                <span class="portal-brand__quill"></span>
              </span>
              <span class="portal-brand__text">
                <strong>شيخ محمد سوقونا</strong>
              </span>
            </a>

            <div class="portal-brand__badge">
              <span>علم</span>
              <span>استماع</span>
              <span>تراث</span>
            </div>
          </div>
        </div>

        <nav class="portal-nav" aria-label="القائمة الرئيسية" style="background: linear-gradient(180deg, #1b4332, #081c15);">
          <div class="container-xl portal-nav__inner">
            <a href="index.html" class="portal-nav__link is-active" aria-current="page">الصفحة الرئيسية</a>
            <a href="#new-audio" class="portal-nav__link">جديد الصوتيات</a>
            <a href="#new-lessons" class="portal-nav__link">جديد الدروس</a>
            <a href="#new-books" class="portal-nav__link">جديد الكتب</a>
            <a href="#contact" class="portal-nav__link">اتصل بنا</a>
          </div>
        </nav>
      </header>
    `;
  }
}

class MainFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="portal-footer" id="contact" style="background: linear-gradient(180deg, #1b4332, #081c15); color: rgba(255, 255, 255, 0.92);">
        <div class="container-xl portal-footer__grid">
          <section class="portal-footer__brand">
            <h3>الموقع الرسمي لـ شيخ محمد سوقونا</h3>
            <p>بوابة منظمة للدروس الصوتية والكتب الإسلامية لطلبة العلم ومحبي الاستماع بالعربية.</p>
          </section>

          <section class="portal-footer__links" aria-label="روابط سريعة">
            <h4>عنوان البلوك</h4>
            <a href="index.html">الصفحة الرئيسية</a>
            <a href="index.html#aqeedah-content">محمد سوقونا</a>
            <a href="majakou.html">محمد ماجاغو</a>
            <a href="makiou.html">محمد ماكيو</a>
          </section>

          <section class="portal-footer__socials">
            <h4>تواصل معنا</h4>
            <a class="portal-social portal-social--youtube" href="https://www.youtube.com/@nazircamara7591" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a class="portal-social portal-social--twitter" href="https://x.com" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a class="portal-social" href="mailto:nazir.camara@gmail.com">البريد الإلكتروني</a>
          </section>
        </div>

        <div class="portal-footer__bar" style="border-top: 1px solid rgba(82, 183, 136, 0.16); background: rgba(255, 255, 255, 0.04);">
          <div class="container-xl portal-footer__bar-inner">
            <span>Powered by شيخ محمد سوقونا</span>
            <a href="#top" class="portal-scroll-top" aria-label="العودة إلى أعلى الصفحة">↑</a>
          </div>
        </div>
      </footer>
    `;
  }
}

if (!customElements.get('main-header')) {
  customElements.define('main-header', MainHeader);
}

if (!customElements.get('main-header')) {
  customElements.define('main-hearder', MainHeader);
}

if (!customElements.get('main-footer')) {
  customElements.define('main-footer', MainFooter);
}

const setupDrawer = () => {
  const drawerOpenTrigger = document.querySelector('[data-drawer-open]');
  const drawer = document.getElementById('site-drawer');
  const drawerCloseTrigger = document.querySelector('[data-drawer-close]');
  const drawerOverlay = document.querySelector('[data-drawer-overlay]');
  const drawerLinks = document.querySelectorAll('[data-drawer-link]');

  if (!drawerOpenTrigger || !drawer || !drawerCloseTrigger || !drawerOverlay) {
    return;
  }

  const openDrawer = () => {
    document.body.classList.add('is-drawer-open');
    drawer.classList.add('is-active');
    drawer.setAttribute('aria-hidden', 'false');
    drawerOpenTrigger.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    document.body.classList.remove('is-drawer-open');
    drawer.classList.remove('is-active');
    drawer.setAttribute('aria-hidden', 'true');
    drawerOpenTrigger.setAttribute('aria-expanded', 'false');
  };

  drawerOpenTrigger.addEventListener('click', openDrawer);
  drawerCloseTrigger.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  audioEnhancer();

  const categoryCards = document.querySelectorAll('.category-card[data-category-target]');
  const categoryPanels = document.querySelectorAll('.category-panel');

  const emptyCategoryHtml = `
    <div class="empty-category-state text-center p-5 bg-white rounded-4 shadow-sm my-4">
      <div class="empty-icon fs-1 mb-2">📂</div>
      <h4 class="text-dark fw-bold">لا توجد دروس متاحة حالياً في هذا القسم</h4>
      <p class="text-secondary mb-0">سيتم إضافة المحتوى الصوتي قريباً إن شاء الله</p>
    </div>
  `;

  const emptyPanelIds = new Set(['quran-content', 'hadith-content', 'fiqh-content']);
  let currentActivePanelId = 'aqeedah-content';

  // Add empty placeholder messages to Quran, Hadith, and Fiqh
  emptyPanelIds.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel && !panel.querySelector('.empty-category-state')) {
      panel.insertAdjacentHTML('beforeend', emptyCategoryHtml);
    }
  });

  const switchTab = (targetId) => {
    currentActivePanelId = targetId;

    // 1. Update Card Styling
    categoryCards.forEach((card) => {
      const isTarget = card.getAttribute('data-category-target') === targetId;
      card.classList.toggle('is-active', isTarget);
      card.setAttribute('aria-pressed', isTarget ? 'true' : 'false');
    });

    // 2. Hide all panels and show only the selected target
    categoryPanels.forEach((panel) => {
      if (panel.id === targetId) {
        panel.classList.add('is-visible');
        panel.style.setProperty('display', 'block', 'important');
      } else {
        panel.classList.remove('is-visible');
        panel.style.setProperty('display', 'none', 'important');
      }
    });
  };

  // Attach click listener to cards
  categoryCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = card.getAttribute('data-category-target');
      if (targetId) switchTab(targetId);
    });
  });

  setupHomeSearch({
    categoryPanels: categoryPanels,
    showPanelCallback: switchTab,
    getCurrentActivePanelId: () => currentActivePanelId
  });

  // Set default active tab
  switchTab('aqeedah-content');

  // Initialize the drawer functionality
  setupDrawer();
});