import React from 'react';
import { Clock, User, FileEdit, FilePlus, Briefcase } from 'lucide-react';

export default function ActivityTimeline({ activities }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getActionIcon = (action, entityType) => {
    if (action === 'created') {
      return <FilePlus className="h-4 w-4" strokeWidth={1.5} />;
    }
    if (action === 'updated') {
      return <FileEdit className="h-4 w-4" strokeWidth={1.5} />;
    }
    return <Briefcase className="h-4 w-4" strokeWidth={1.5} />;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) return null;

    return (
      <div className="mt-2 text-xs text-muted-foreground">
        <div className="space-y-1">
          {Object.entries(changes).slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
              <span className="flex-1">
                {value.old && <span className="line-through text-red-600">{String(value.old).substring(0, 30)}</span>}
                {value.old && value.new && <span className="mx-1">→</span>}
                {value.new && <span className="text-green-600">{String(value.new).substring(0, 30)}</span>}
              </span>
            </div>
          ))}
          {Object.keys(changes).length > 3 && (
            <div className="text-xs text-muted-foreground italic">
              +{Object.keys(changes).length - 3} more changes
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id || index} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full ${getActionColor(activity.action)}`}>
              {getActionIcon(activity.action, activity.entity_type)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-full bg-border mt-2" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-6">
            <div className="bg-white border border-border rounded-none p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium ${getActionColor(activity.action)}`}>
                      {activity.action}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {activity.entity_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{activity.entity_name}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  {formatDate(activity.timestamp)}
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <User className="h-3 w-3" strokeWidth={1.5} />
                {activity.user_name}
              </div>

              {formatChanges(activity.changes)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
