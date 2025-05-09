import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { DateConverterComponent } from './date-converter/date-converter.component';
import { FileDifferenceComponent } from './file-difference/file-difference.component';
import { TestDataGeneratorComponent } from './test-data-generator/test-data-generator.component';
import { AboutComponent } from './about/about.component';
import { DataToolsSelectionComponent } from './data-tools-selection/data-tools-selection.component';
import { FileFormatSelectionComponent } from './file-format-selection/file-format-selection.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'data-tools', component: DataToolsSelectionComponent },
  { path: 'file-formats', component: FileFormatSelectionComponent },
  { path: 'date-converter', component: DateConverterComponent },
  { path: 'file-difference', component: FileDifferenceComponent },
  { path: 'test-data-generator', component: TestDataGeneratorComponent },
  { path: 'about', component: AboutComponent },
  { path: '**', redirectTo: '' } // Redirect to landing page for any unknown routes
];
