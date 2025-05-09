import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  constructor(private router: Router) {}
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
  
  // Navigate to a route and close the sidebar
  navigateAndCloseSidebar(route: string): void {
    this.router.navigate([route]);
    this.toggleSidebar();
  }
  
  // Navigate to a route without affecting the sidebar
  navigateOnly(route: string): void {
    this.router.navigate([route]);
  }
}
