import React from "react";
import { Input } from "@/components/ui/input";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { Search } from "lucide-react";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past Due" },
  { value: "canceled", label: "Canceled" },
];

export default function SubscriptionToolbar({ search, onSearch, filter, onFilter }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by customer name or email"
          aria-label="Search subscribers"
          className="glass-input pl-9 h-10"
        />
      </div>
      <ResponsiveSelect
        aria-label="Filter subscribers"
        value={filter}
        onChange={onFilter}
        options={FILTERS}
        className="sm:w-48"
      />
    </div>
  );
}