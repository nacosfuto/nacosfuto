import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Clock, Video } from "lucide-react";
import { BrutalCard } from "../ui/BrutalCard";
import { LevelBadge } from "../ui/LevelBadge";
import { cn } from "../../lib/utils";

export function CourseCard({ course, enrolled = false, progress = 0 }) {
  const isWorkshopEnded =
    course.is_live_workshop &&
    course.workshop_details?.date &&
    new Date(course.workshop_details.date) < new Date();

  return (
    <Link to={`/courses/${course.id}`} className="block h-full group">
      <BrutalCard
        interactive
        className="h-full flex flex-col overflow-hidden p-0 transition-transform group-hover:-translate-y-0.5"
      >
        {/* Course Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={course.thumbnail || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569330/nacos/gallery/nacos2.jpg"}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
            {course.is_live_workshop && (
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded shadow-xs",
                  isWorkshopEnded
                    ? "bg-muted text-muted-foreground"
                    : "bg-[#0056D2] text-white"
                )}
              >
                <Video size={10} className="mr-1" />
                {isWorkshopEnded ? "Ended" : "Live Workshop"}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <LevelBadge level={course.level} />
            {enrolled && (
              <span className="text-[10px] font-mono font-semibold text-[#0056D2] dark:text-[#1d72fe] bg-blue-600/10 px-2 py-0.5 rounded border border-[#0056D2]/20">
                Enrolled
              </span>
            )}
          </div>

          <h3 className="font-bold text-base leading-snug line-clamp-2 text-foreground group-hover:text-[#0056D2] transition-colors mb-2">
            {course.title}
          </h3>

          <p className="text-muted-foreground text-xs leading-relaxed mb-3 line-clamp-2">
            {course.description}
          </p>

          {/* Workshop Details if applicable */}
          {course.is_live_workshop && course.workshop_details && (
            <div className="space-y-1 mb-3 font-mono text-[11px] text-muted-foreground bg-secondary/50 p-2.5 rounded-md">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-[#0056D2]" />
                <span>
                  {course.workshop_details.date} at {course.workshop_details.time}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-[#0056D2]" />
                <span className="truncate">{course.workshop_details.location}</span>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {course.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Progress Bar */}
          {enrolled && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground font-mono text-[11px]">Progress</span>
                <span className="font-bold text-[11px]">{progress}%</span>
              </div>
              <div className="progress-brutal">
                <div
                  className="progress-brutal-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </BrutalCard>
    </Link>
  );
}

export default CourseCard;
