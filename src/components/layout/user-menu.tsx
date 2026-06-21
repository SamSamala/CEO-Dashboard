"use client";

import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, LogOut, User, KeyRound } from "lucide-react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

interface UserMenuProps {
  name: string;
  email: string;
  image?: string | null;
  role: string;
}

export function UserMenu({ name, email, image, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-muted transition-colors outline-none">
        <Avatar className="h-7 w-7">
          <AvatarImage src={image ?? ""} />
          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start text-left">
          <span className="text-sm font-medium leading-none">{name}</span>
          <span className="text-xs text-muted-foreground">{role}</span>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 flex flex-col gap-0.5">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/settings" className="flex items-center gap-2 w-full">
            <User className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/settings/password" className="flex items-center gap-2 w-full">
            <KeyRound className="h-4 w-4" />
            Change Password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
