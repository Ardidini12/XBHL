import { CalendarClock, Home, Trophy, Users } from "lucide-react"
import { Home, ShieldHalf, Trophy, Users } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [{ icon: Home, title: "Dashboard", path: "/" }]

/**
 * Render the application sidebar with navigation, appearance controls, and the current user panel.
 *
 * When the authenticated user is a superuser, additional admin navigation entries are included.
 *
 * @returns The sidebar JSX element containing header, navigation items, appearance controls, and the user panel
 */
export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [
        ...baseItems,
        { icon: Users, title: "Admin", path: "/admin" },
        { icon: Trophy, title: "XBHL", path: "/leagues" },
        { icon: CalendarClock, title: "Schedulers", path: "/schedulers" },
        { icon: ShieldHalf, title: "Clubs", path: "/clubs" },
      ]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
