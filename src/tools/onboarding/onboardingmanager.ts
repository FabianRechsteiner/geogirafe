import { Config, Driver, driver, DriveStep, State } from 'driver.js';
import GirafeSingleton from '../../base/GirafeSingleton';
import 'driver.js/dist/driver.css';

export default class OnBoardingManager extends GirafeSingleton {
  private get config() {
    return this.context.configManager.Config;
  }

  private readonly STORAGE_ITEM_NAME = 'geogirafe-onboarding';

  public async start() {
    if (!this.config.onboarding) {
      // No tour configured
      return;
    }

    await this.context.i18nManager.ensureTranslationLoaded();

    const tourAlreadyDone = sessionStorage.getItem(this.STORAGE_ITEM_NAME);
    if (tourAlreadyDone !== 'true') {
      const onboardingDriver = driver({
        showProgress: true,
        onDestroyed: (
          _element: Element | undefined,
          _step: DriveStep,
          _options: { config: Config; state: State; driver: Driver }
        ) => {
          sessionStorage.setItem(this.STORAGE_ITEM_NAME, 'true');
        },
        nextBtnText: this.context.i18nManager.getTranslation('onboarding-next-button-text'),
        prevBtnText: this.context.i18nManager.getTranslation('onboarding-previous-button-text'),
        doneBtnText: this.context.i18nManager.getTranslation('onboarding-done-button-text'),
        progressText: this.context.i18nManager.getTranslation('onboarding-progress-text')
      });
      const steps = [] as DriveStep[];
      for (const stepConfig of this.config.onboarding.steps) {
        let element: string | Element | undefined;
        if (stepConfig.component) {
          // @ts-expect-error getChildElement is protected, but  we do not want to make it public,
          // because we should not give access to the shadow from from outside.
          // The onboarding is a very special case, because we want to be able
          // to focus an HTML element inside the shadow dom, to show help text.
          // So this should be the only exception to this protected access.
          // prettier-ignore
          element = this.context.componentManager.getComponentsByName(stepConfig.component)[0].getChildElement(stepConfig.element) ?? undefined;
        } else {
          element = stepConfig.element;
        }
        const step: DriveStep = {
          element: element,
          popover: {
            title: this.context.i18nManager.getTranslation(stepConfig.title),
            description: this.context.i18nManager.getTranslation(stepConfig.description)
          }
        };
        steps.push(step);
      }
      onboardingDriver.setSteps(steps);
      onboardingDriver.drive();
    }
  }
}
