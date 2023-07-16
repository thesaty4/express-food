import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthComponent } from './core/auth/components/auth/auth.component';
import { LoginComponent } from './core/auth/components/login/login.component';
import { PasswordResetComponent } from './core/auth/components/password-reset/password-reset.component';
import { SignUpComponent } from './core/auth/components/sign-up/sign-up.component';
import { HomeComponent } from './core/auth/components/home/home.component';
import { NotFoundComponent } from './core/auth/components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'auth',
    component: AuthComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'signup',
    component: SignUpComponent,
  },
  {
    path: 'reset-password',
    component: PasswordResetComponent,
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('../../projects/admin/src/app/app.module').then(
        (m) => m.AppModule
      ),
  },
  {
    path: 'user',
    loadChildren: () =>
      import('../../projects/web-user/src/app/app.module').then(
        (m) => m.AppModule
      ),
  },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
