export type GoogleAdsConfig = {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
};

export function getGoogleAdsConfig(
  projectCustomerId?: string | null,
): GoogleAdsConfig | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim();
  const customerId =
    projectCustomerId?.trim() || process.env.GOOGLE_ADS_CUSTOMER_ID?.trim();

  if (
    !developerToken ||
    !clientId ||
    !clientSecret ||
    !refreshToken ||
    !customerId
  ) {
    return null;
  }

  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId: customerId.replace(/-/g, ""),
  };
}

export function isGoogleAdsConfigured(projectCustomerId?: string | null): boolean {
  return getGoogleAdsConfig(projectCustomerId) !== null;
}
