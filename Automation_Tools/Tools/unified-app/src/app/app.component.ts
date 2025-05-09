import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Unified Data Tools';
  
  // Track expanded state of dropdown menus
  expandedMenus: { [key: string]: boolean } = {
    applications: true,
    dataTools: false,
    fileDifference: false,
    more: false
  };
  
  // Track sidebar visibility for mobile
  isSidebarVisible = false;
  
  // Toggle dropdown menu
  toggleMenu(menu: string): void {
    this.expandedMenus[menu] = !this.expandedMenus[menu];
  }
  
  // Check if menu is expanded
  isExpanded(menu: string): boolean {
    return this.expandedMenus[menu];
  }
  
  // Toggle sidebar visibility for mobile
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    
    // When opening the sidebar, we want to make sure the body doesn't scroll
    if (this.isSidebarVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}
