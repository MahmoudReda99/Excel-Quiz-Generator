import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, concat, interval } from 'rxjs';
import { filter, first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  public isUpdateAvailable$ = new BehaviorSubject<boolean>(false);
  public isUpdating$ = new BehaviorSubject<boolean>(false);

  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef
  ) {
    if (this.swUpdate.isEnabled) {
      this.initUpdateListeners();
    }
  }

  private initUpdateListeners(): void {
    // 1. Listen for new version downloaded and ready for activation
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        console.log('[PWA] New version ready for activation');
        this.isUpdateAvailable$.next(true);
      });

    // 2. Handle unrecoverable state (corrupted cache or major breaking change)
    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('[PWA] Unrecoverable state detected, reloading:', event.reason);
      window.location.reload();
    });

    // 3. Proactively check for updates when app becomes stable and periodically every 15 minutes
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const every15Minutes$ = interval(15 * 60 * 1000);
    const updateCheck$ = concat(appIsStable$, every15Minutes$);

    updateCheck$.subscribe(() => {
      this.checkForUpdate();
    });

    // 4. Also check when user returns to the app (focus or visibility changed) or goes back online
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.checkForUpdate());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdate();
        }
      });
      window.addEventListener('online', () => this.checkForUpdate());
    }
  }

  public checkForUpdate(): void {
    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.checkForUpdate().then(hasUpdate => {
      if (hasUpdate) {
        console.log('[PWA] An update is available on the server');
      }
    }).catch(err => {
      console.warn('[PWA] Error checking for update:', err);
    });
  }

  public activateUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      window.location.reload();
      return Promise.resolve();
    }
    this.isUpdating$.next(true);
    return this.swUpdate.activateUpdate().then(() => {
      window.location.reload();
    }).catch(err => {
      console.error('[PWA] Failed to activate update:', err);
      window.location.reload();
    });
  }

  public dismissBanner(): void {
    this.isUpdateAvailable$.next(false);
  }
}
