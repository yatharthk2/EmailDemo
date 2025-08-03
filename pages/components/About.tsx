import React from "react";
import config from "../index.json";
import Image from "next/image";

const About = () => {
  const about = config.about;
  return (
    <div id="About" className="px-8 md:px-32 pb-32 content-center bg-gradient-to-r from-teal-50 to-cyan-50">
      <h1 className="pt-12 uppercase font-bold text-center text-teal-600 text-4xl tracking-wider">{about.title}</h1>
      <div className="mt-16 flex flex-col md:flex-row align-center items-center">
        <div className="md:w-1/2 w-full flex justify-center content-center">
          <div className="relative rounded-xl overflow-hidden border border-teal-200 shadow-md">
            <Image 
              src={about.image} 
              alt="about" 
              width={320} 
              height={320}
              className="transition-all duration-500 hover:scale-105"
            />
          </div>
        </div>
        <div className="pt-12 md:py-0 md:w-1/2 text-slate-700 md:ml-8 text-center md:text-left">
          <div className="about__primary font-medium text-xl">
            <span>{about.primary}</span>
          </div>
          <div className="mt-6 text-slate-600">
            <span>{about.secondary}</span>
          </div>
        </div>
      </div>
      
      {/* Feature section - optional addition */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/*
          { title: "Feature 1", description: "Brief description of a key feature or benefit" },
          { title: "Feature 2", description: "Brief description of a key feature or benefit" },
          { title: "Feature 3", description: "Brief description of a key feature or benefit" }
        */}
      </div>
    </div>
  );
};

export default About;