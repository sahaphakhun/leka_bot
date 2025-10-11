/**
 * Bordio-Style Tailwind CSS Configuration for Leka Bot
 * 
 * This configuration extends Tailwind CSS with Bordio's color palette,
 * shadows, and other design tokens.
 * 
 * Usage: Replace your existing tailwind.config.js with this file
 */

module.exports = {
  content: [
    "./dashboard/**/*.{html,js}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: '#2196F3',
          light: '#E3F2FD',
          dark: '#1976D2',
          darker: '#1565C0',
        },
        
        // Navy (Sidebar)
        navy: {
          DEFAULT: '#1A1D2E',
          light: '#2A2D3E',
        },
        
        // Status Colors
        status: {
          new: {
            bg: '#E1BEE7',
            border: '#9C27B0',
            text: '#6A1B9A',
          },
          scheduled: {
            bg: '#BBDEFB',
            border: '#2196F3',
            text: '#1976D2',
          },
          progress: {
            bg: '#C8E6C9',
            border: '#4CAF50',
            text: '#388E3C',
          },
          completed: {
            bg: '#E0E0E0',
            border: '#9E9E9E',
            text: '#616161',
          },
        },
        
        // Type Colors
        type: {
          operational: {
            bg: '#E3F2FD',
            text: '#1976D2',
          },
          technical: {
            bg: '#E1F5FE',
            text: '#0277BD',
          },
          strategic: {
            bg: '#E8F5E9',
            text: '#388E3C',
          },
          hiring: {
            bg: '#F1F8E9',
            text: '#689F38',
          },
          financial: {
            bg: '#FFF9C4',
            text: '#F57F17',
          },
        },
        
        // Semantic Colors
        success: {
          DEFAULT: '#4CAF50',
          light: '#E8F5E9',
          dark: '#388E3C',
        },
        warning: {
          DEFAULT: '#FF9800',
          light: '#FFF3E0',
          dark: '#F57C00',
        },
        error: {
          DEFAULT: '#F44336',
          light: '#FFEBEE',
          dark: '#D32F2F',
        },
        info: {
          DEFAULT: '#2196F3',
          light: '#E3F2FD',
          dark: '#1976D2',
        },
        
        // Neutral Colors (Extended Gray Scale)
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
        
        // Special Colors
        note: {
          bg: '#FFF8E1',
        },
        highlight: {
          yellow: '#FFF9C4',
        },
        
        // Leaderboard Colors
        leaderboard: {
          gold: '#FBBF24',
          silver: '#9CA3AF',
          bronze: '#D97706',
        },
      },
      
      // Box Shadows (Bordio-style)
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
        'md': '0 4px 8px 0 rgba(0, 0, 0, 0.12)',
        'lg': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
        'xl': '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        'none': 'none',
      },
      
      // Border Radius
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      
      // Spacing (Additional)
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Font Family
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      
      // Font Size (Matching Bordio)
      fontSize: {
        'xs': '0.75rem',    // 12px
        'sm': '0.875rem',   // 14px
        'base': '1rem',     // 16px
        'lg': '1.125rem',   // 18px
        'xl': '1.25rem',    // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
      },
      
      // Line Height
      lineHeight: {
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '2',
      },
      
      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      
      // Z-Index
      zIndex: {
        '100': '100',
        '200': '200',
        '300': '300',
        '400': '400',
        '500': '500',
        '1000': '1000',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-in': 'slideIn 0.3s ease',
        'spin': 'spin 1s linear infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [
    // Add custom utilities
    function({ addUtilities }) {
      const newUtilities = {
        '.transition-fast': {
          transition: 'all 0.15s ease',
        },
        '.transition-base': {
          transition: 'all 0.2s ease',
        },
        '.transition-slow': {
          transition: 'all 0.3s ease',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      }
      addUtilities(newUtilities)
    },
    
    // Add component classes
    function({ addComponents }) {
      const components = {
        '.btn-bordio': {
          '@apply inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-base': {},
        },
        '.btn-bordio-primary': {
          '@apply btn-bordio bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow-md': {},
        },
        '.btn-bordio-outline': {
          '@apply btn-bordio bg-white text-gray-700 border border-gray-300 hover:bg-gray-50': {},
        },
        '.btn-bordio-secondary': {
          '@apply btn-bordio bg-gray-600 text-white hover:bg-gray-700': {},
        },
        '.card-bordio': {
          '@apply bg-white rounded-lg shadow-sm border border-gray-200 p-6': {},
        },
        '.badge-bordio': {
          '@apply inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium': {},
        },
        '.input-bordio': {
          '@apply w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-base': {},
        },
      }
      addComponents(components)
    },
  ],
}

