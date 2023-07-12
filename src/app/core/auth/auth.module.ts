import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './components/login/login.component';
import { AuthComponent } from './components/auth/auth.component';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';
import { HomeComponent } from './components/home/home.component';



@NgModule({
  declarations: [LoginComponent, AuthComponent, PasswordResetComponent, SignUpComponent, HomeComponent],
  imports: [
    CommonModule
  ]
})
export class AuthModule { }
