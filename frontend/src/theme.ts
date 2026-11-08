import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';

export const SIMORAWA_COLORS = {
  primaryDarkNavy: '#112D4E',
  primaryAccentBlue: '#3F72AF',
  borderLight: '#DBE2EF',
  bgOffWhite: '#F9F7F7',
} as const;

export const simorawaTheme: ThemeConfig = {
  token: {
    colorPrimary: SIMORAWA_COLORS.primaryAccentBlue,
    colorInfo: SIMORAWA_COLORS.primaryDarkNavy,
    colorTextBase: SIMORAWA_COLORS.primaryDarkNavy,
    colorBorder: SIMORAWA_COLORS.borderLight,
    colorBgLayout: SIMORAWA_COLORS.bgOffWhite,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    borderRadius: 6,
  },
  components: {
    Layout: {
      colorBgHeader: SIMORAWA_COLORS.bgOffWhite,
      colorBgBody: SIMORAWA_COLORS.bgOffWhite,
      colorBgTrigger: SIMORAWA_COLORS.primaryDarkNavy,
    },
    Menu: {
      colorItemBg: SIMORAWA_COLORS.primaryDarkNavy,
      colorItemText: '#FFFFFF',
      colorItemTextSelected: '#FFFFFF',
      colorItemBgSelected: SIMORAWA_COLORS.primaryAccentBlue,
    },
    Button: {
      colorPrimary: SIMORAWA_COLORS.primaryAccentBlue,
      colorPrimaryHover: SIMORAWA_COLORS.primaryDarkNavy,
    },
  },
};
