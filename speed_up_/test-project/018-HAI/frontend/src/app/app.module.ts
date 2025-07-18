import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {NZ_I18N} from 'ng-zorro-antd/i18n';
import {en_US} from 'ng-zorro-antd/i18n';
import {registerLocaleData} from '@angular/common';
import en from '@angular/common/locales/en';
import {LoginModule} from "./pages/login/login.module";
import {HttpClientModule} from "@angular/common/http";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

registerLocaleData(en);

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        LoginModule,
        HttpClientModule,
        BrowserAnimationsModule
    ],
    providers: [
        {provide: NZ_I18N, useValue: en_US},
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
