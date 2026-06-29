/**
 * All CSS class names used by the Navbar, kept as constants.
 *
 * These match the existing class names in `navbar.css` exactly, so the old
 * styling is reused as-is. Because they live here as a typed `const`, the
 * component references `navbarClasses.navItem` instead of the raw string
 * "nav-item" — readable, and safe from typos.
 */
export const navbarClasses = {
  header: "site-header",
  nav: "navbar",
  navHome: "navbar--home", // extra modifier for the transparent homepage navbar
  scrolled: "scrolled", // added once the user scrolls down
  active: "active", // added when the mobile menu is open

  logo: "logo",
  logoImage: "logoimage",
  logoTitleWrap: "logotitlewrap",
  logoTitle: "logotitle",
  logoTitle2: "logotitle2",
  divider: "hr1",

  navMenu: "nav-menu",
  navItem: "nav-item",
  dropdownButton: "dropdown-btn",
  dropdownContent: "dropdown-content",
  dropdownOpen: "open", // added to a dropdown <li> when expanded in the hamburger menu
  arrow: "arrow",

  // Search shown at the top of the mobile hamburger menu (above "Home").
  navSearch: "nav-search", // the <li> wrapper — hidden on desktop, shown on mobile
  navSearchForm: "nav-search-form", // the <form> (in normal flow, not absolutely positioned)

  searchHamburger: "search-hamburger",
  hamburger: "hamburger",
  bar: "bar",
  searchBar: "search-bar",
  searchForm: "search",
  searchBox: "searchbox",
  searchButton: "searchbutton",
} as const;
