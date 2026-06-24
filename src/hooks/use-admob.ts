import { useEffect, useCallback } from "react";

// AdMob configuration
const AD_CONFIG = {
  appId: "ca-app-pub-1017007756363897~9648031243",
  banner: "ca-app-pub-1017007756363897/5113899609",
  interstitial: "ca-app-pub-1017007756363897/5156382503",
  rewarded: "ca-app-pub-1017007756363897/4821324675",
  rewardedInterstitial: "ca-app-pub-1017007756363897/4718109242",
  appOpen: "ca-app-pub-1017007756363897/5956198244",
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
          testingDevices: ['CF4709BF-3238-466B-9A7A-CF622DB060C2'],
          initializeForTesting: true,
        });
        console.log("AdMob initialized successfully");
      } catch (error) {
        console.error("AdMob initialization error:", error);
      }
    };

    initAdMob();
  }, []);

  const showBanner = useCallback(async (
    position: "top" | "bottom" = "bottom",
    onVisible?: () => void,
    onFailed?: () => void,
  ): Promise<boolean> => {
    if (!isNative()) return false;

    try {
      const { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents } = await import("@capacitor-community/admob");
      let settled = false;
      let loadedListener: { remove: () => void } | undefined;
      let failedListener: { remove: () => void } | undefined;
      let sizeListener: { remove: () => void } | undefined;
      const cleanupBannerListeners = () => {
        loadedListener?.remove();
        failedListener?.remove();
        sizeListener?.remove();
      };
      loadedListener = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        settled = true;
        onVisible?.();
        cleanupBannerListeners();
      });
      failedListener = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
        settled = true;
        onFailed?.();
        cleanupBannerListeners();
      });
      sizeListener = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: any) => {
        if (Number(info?.height || 0) > 0) {
          settled = true;
          onVisible?.();
          cleanupBannerListeners();
        }
      });
      await AdMob.showBanner({
        adId: AD_CONFIG.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: position === "top" ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
      window.setTimeout(() => {
        if (!settled) cleanupBannerListeners();
      }, 5000);
      return true;
    } catch (error) {
      console.error("Banner ad error:", error);
      onFailed?.();
      return false;
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

  const showRewarded = useCallback(async (): Promise<"rewarded" | "dismissed" | "failed"> => {
    if (!isNative()) return "failed";

    try {
      const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");
      
      return new Promise(async (resolve) => {
        let resolved = false;
        const cleanup = (listeners: Array<{ remove: () => void } | undefined>) => {
          listeners.forEach((listener) => listener?.remove());
        };
        let rewardListener: { remove: () => void } | undefined;
        let dismissListener: { remove: () => void } | undefined;
        let failedLoadListener: { remove: () => void } | undefined;
        let failedShowListener: { remove: () => void } | undefined;
        
        rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          if (!resolved) {
            resolved = true;
            cleanup([rewardListener, dismissListener, failedLoadListener, failedShowListener]);
            resolve("rewarded");
          }
        });

        dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          if (!resolved) {
            resolved = true;
            cleanup([rewardListener, dismissListener, failedLoadListener, failedShowListener]);
            resolve("dismissed");
          }
        });

        failedLoadListener = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          if (!resolved) {
            resolved = true;
            cleanup([rewardListener, dismissListener, failedLoadListener, failedShowListener]);
            resolve("failed");
          }
        });

        failedShowListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          if (!resolved) {
            resolved = true;
            cleanup([rewardListener, dismissListener, failedLoadListener, failedShowListener]);
            resolve("failed");
          }
        });

        try {
          await AdMob.prepareRewardVideoAd({ adId: AD_CONFIG.rewarded });
          const directReward = await AdMob.showRewardVideoAd();
          if (!resolved && directReward) {
            resolved = true;
            cleanup([rewardListener, dismissListener, failedLoadListener, failedShowListener]);
            resolve("rewarded");
          }
        } catch (error) {
          console.error("Rewarded ad error:", error);
          cleanup([rewardListener, dismissListener, failedLoadListener, failedShowListener]);
          resolve("failed");
        }
      });
    } catch (error) {
      console.error("Rewarded ad error:", error);
      return "failed";
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
