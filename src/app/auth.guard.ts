import {inject} from '@angular/core'
import {CanActivateFn, Router} from '@angular/router'
import {AuthService} from './auth.service'
import {map, take, tap} from 'rxjs/operators'

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.user$.pipe(
    take(1),
    map(user => !!user),
    tap(async isLoggedIn => {
      if (!isLoggedIn) {
        await router.navigate(['/login'])
      }
    })
  )
}

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  return authService.user$.pipe(
    take(1),
    tap(user => {
      if (user) {
        router.navigate(['/dashboard']);
      }
    }),
    map(user => !user)
  )
}
