import React from 'react';
import PortalLayout from '../components/PortalLayout';
import PortalEventsSection from '../components/PortalEventsSection';

export default function Events() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <PortalEventsSection
          limit={null}
          showFilters={true}
          showViewAllLink={true}
          title="Department Events & Summits"
          subtitle="Explore all upcoming tech summits, workshops, hackathons, and our past archive"
        />
      </div>
    </PortalLayout>
  );
}
