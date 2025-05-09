import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-format-selection',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './file-format-selection.component.html',
  styleUrls: ['./file-format-selection.component.scss']
})
export class FileFormatSelectionComponent {
  constructor() { }
}
