import { useEffect, useCallback } from "react";

// AdMob configuration
const AD_CONFIG = {
  appId: "ca-app-pub-1017007756363897~3426274533",
  banner: "ca-app-pub-1017007756363897/6062980508",
  interstitial: "ca-app-pub-1017007756363897/5156382503",
  rewarded: "ca-app-pub-1017007756363897/4821324675",
  rewardedInterstitial: "ca-app-pub-1017007756363897/4718109242",
  appOpen: "ca-app-pub-1017007756363897/3816091114",
  nativeAdvanced: "ca-app-pub-1017007756363897/3651729143",
};

// Check if running in Capacitor native environment
const isNative = () => {
  return typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.isNativePlatform();
};

export const useAdMob = () => {
  useEffect(() => {
    const initAdMob = async () => {
      if (!isNative()) {
        console.log("AdMob: Not running in native environment, skipping initialization");
        return;
      }

      try {
        const { AdMob } = await import("@capacitor-community/admob");
        await AdMob.initialize({
          initializeForTesting: false,
        });
        console.log("AdMob initialized successfully");
      } catch (error) {
        console.error("AdMob initialization error:", error);
      }
    };

    initAdMob();
  }, []);

  const showBanner = useCallback(async (position: "top" | "bottom" = "bottom") => {
    if (!isNative()) return;

    try {
      const { AdMob, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");
      await AdMob.showBanner({
        adId: AD_CONFIG.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: position === "top" ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
    } catch (error) {
      console.error("Banner ad error:", error);
    }
  }, []);

  const hideBanner = useCallback(async () => {
    if (!isNative()) return;

    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.hideBanner();
    } catch (error) {
      console.error("Hide banner error:", error);
    }
  }, []);

  const showInterstitial = useCallback(async () => {
    if (!isNative()) return;

    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.prepareInterstitial({ adId: AD_CONFIG.interstitial });
      await AdMob.showInterstitial();
    } catch (error) {
      console.error("Interstitial ad error:", error);
    }
  }, []);

  const showRewarded = useCallback(async (): Promise<boolean> => {
    if (!isNative()) return false;

    try {
      const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");
      
      return new Promise(async (resolve) => {
        let resolved = false;
        
        const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          if (!resolved) {
            resolved = true;
            rewardListener.remove();
            resolve(true);
          }
        });

        const dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          if (!resolved) {
            resolved = true;
            dismissListener.remove();
            resolve(false);
          }
        });

        try {
          await AdMob.prepareRewardVideoAd({ adId: AD_CONFIG.rewarded });
          await AdMob.showRewardVideoAd();
        } catch (error) {
          console.error("Rewarded ad error:", error);
          rewardListener.remove();
          dismissListener.remove();
          resolve(false);
        }
      });
    } catch (error) {
      console.error("Rewarded ad error:", error);
      return false;
    }
  }, []);

  const showAppOpenAd = useCallback(async () => {
    if (!isNative()) return;

    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.prepareInterstitial({ adId: AD_CONFIG.appOpen });
      await AdMob.showInterstitial();
    } catch (error) {
      console.error("App open ad error:", error);
    }
  }, []);

  return {
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded,
    showAppOpenAd,
    isNative: isNative(),
  };
};
