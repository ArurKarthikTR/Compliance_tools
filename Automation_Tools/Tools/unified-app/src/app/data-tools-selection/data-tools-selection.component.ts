import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-tools-selection',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './data-tools-selection.component.html',
  styleUrls: ['./data-tools-selection.component.scss']
})
export class DataToolsSelectionComponent {
  constructor() { }
}
