// import { Component } from '@angular/core'
// import { RouterOutlet } from '@angular/router'
//
// @Component({
//   selector: 'app-root',
//   imports: [RouterOutlet],
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.sass'
// })
// export class AppComponent {
//   title = 'atlas'
// }

import { Component } from '@angular/core'
import { DashboardComponent } from './dashboard/dashboard.component'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [DashboardComponent],
  styleUrl: './app.component.sass'
})
export class AppComponent {
  title = 'atlas'
}
