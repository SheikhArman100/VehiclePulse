import {
  LayoutDashboard,
  Truck,
  MapPin,
  AlertTriangle,
  BarChart3,
  Server,
  Activity,
  LucideIcon,
} from "lucide-react";

export interface MenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

export interface MenuGroup {
  groupTitle: string;
  items: MenuItem[];
}

export const SIDEBAR_NAVIGATION: MenuGroup[] = [
  {
    groupTitle: "Fleet Operations",
    items: [
      {
        title: "Overview",
        path: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Fleet Vehicles",
        path: "/vehicles",
        icon: Truck,
      },
      {
        title: "Live Map",
        path: "/map",
        icon: MapPin,
      },
    ],
  },
  {
    groupTitle: "Streaming & Intelligence",
    items: [
      {
        title: "Alert Incidents",
        path: "/alerts",
        icon: AlertTriangle,
      },
      {
        title: "Analytics & Rollups",
        path: "/analytics",
        icon: BarChart3,
      },
      {
        title: "Kafka Pipeline",
        path: "/kafka",
        icon: Server,
      },
    ],
  },
];
