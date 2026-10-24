"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";

import { usePosNavigationGuard } from "./pos-navigation-guard";

interface UserMenuProps {
  email: string;
}

export function UserMenu({ email }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const initial = (email.charAt(0) || "P").toUpperCase();

  const { requestLeave } = usePosNavigationGuard();

  function runSignOut() {
    startTransition(async () => {
      const result = await signOut();
      if (result?.error) toast.error(result.error);
    });
  }

  function handleSignOut() {
    // POS Focus Mode: transaksi kasir yang belum selesai dikonfirmasi dulu.
    if (requestLeave("logout", runSignOut)) runSignOut();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-left md:block">
          <span className="block text-sm leading-tight font-medium">Pemilik</span>
          <span className="block max-w-40 truncate text-xs text-muted-foreground">{email}</span>
        </span>
        <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="flex items-center gap-2">
              <UserRound aria-hidden className="size-3.5" />
              Masuk sebagai pemilik
            </span>
            <span className="mt-0.5 block truncate font-normal text-foreground">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleSignOut}>
          <LogOut />
          {isPending ? "Keluar…" : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
