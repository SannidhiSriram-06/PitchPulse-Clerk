import { driver } from 'driver.js';

export const startTour = () => {
  const tourObj = driver({
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayColor: 'rgba(0,0,0,0.7)',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Got it!',
    onDestroyed: () => {
      localStorage.setItem('tour_completed', 'true');
    },
    steps: [
      {
        element: '#watchlist-sidebar',
        popover: {
          title: 'Your Watchlist',
          description: 'Pin companies you meet with regularly. Click "Brief Me" to instantly generate a brief for any of them.',
        },
        onHighlightStarted: (element, step, { config, state }) => {
          if (!element) {
            tourObj.moveNext();
          }
        }
      },
      {
        element: '#generate-brief-btn',
        popover: {
          title: 'Generate a Brief',
          description: 'Click here to research any company. Type a name and get a full AI brief in under 60 seconds.',
        },
        onHighlightStarted: (element, step, { config, state }) => {
          if (!element) {
            tourObj.moveNext();
          }
        }
      },
      {
        element: '#briefs-list',
        popover: {
          title: 'Your Brief History',
          description: 'All your generated briefs appear here. Click any card to read the full brief, or save it for later.',
        },
        onHighlightStarted: (element, step, { config, state }) => {
          if (!element) {
            tourObj.moveNext();
          }
        }
      },
      {
        element: '#search-bar',
        popover: {
          title: 'Search Your Briefs',
          description: 'Looking for a past brief? Search by company name here.',
        },
        onHighlightStarted: (element, step, { config, state }) => {
          if (!element) {
            tourObj.moveNext();
          }
        }
      },
      {
        element: '#customize-btn',
        popover: {
          title: 'Customize Your Experience',
          description: 'Change your default brief length, switch between tabs and cards view, toggle dark/light mode, and more.',
        },
        onHighlightStarted: (element, step, { config, state }) => {
          if (!element) {
            tourObj.moveNext();
          }
        }
      },
      {
        element: '#tour-help-btn',
        popover: {
          title: 'Need a refresher?',
          description: 'Click this ? button anytime to replay this tour.',
        },
        onHighlightStarted: (element, step, { config, state }) => {
          if (!element) {
            tourObj.moveNext();
          }
        }
      }
    ]
  });

  tourObj.drive();
};

export const resetTour = () => {
  localStorage.removeItem('tour_completed');
};
