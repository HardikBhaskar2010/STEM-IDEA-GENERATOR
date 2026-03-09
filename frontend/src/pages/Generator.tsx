import React, { useState, useCallback, useEffect } from "react";
import { Zap, Loader2, Save, Code } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CapsuleAnimation } from "@/components/ui/capsule-animation";
import { HolographicCard } from "@/components/HolographicCard";
import { useNavigate } from "react-router-dom";

import { projectService } from "@/services/projectService";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievements } from "@/contexts/AchievementContext";

type GeneratedProject = {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  estimatedCost: string;
  components: string[];
  skills: string[];
  steps: string[];
};

type FormData = {
  projectType: string;
  skillLevel: string;
  interests: string;
  budget: string;
  duration: string;
};

const Generator: React.FC = () => {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const { checkForNewAchievements } = useAchievements();

  const [formData, setFormData] = useState<FormData>({
    projectType: "",
    skillLevel: "",
    interests: "",
    budget: "",
    duration: ""
  });

  const [generatedProject, setGeneratedProject] =
    useState<GeneratedProject | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesized, setIsSynthesized] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  const API =
    import.meta.env.VITE_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    "";

  /* ------------------------------
     Backend Health Check
  ------------------------------ */

  useEffect(() => {
    console.log("💎 STEM Project Lab AI Engine: Ready");
  }, []);

  /* ------------------------------
     Generate Project
  ------------------------------ */

  const handleGenerate = useCallback(async () => {
    if (!formData.projectType || !formData.skillLevel) {
      toast({
        title: "Missing Information",
        description: "Select project type and skill level",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setIsSynthesized(false);

    try {
      const res = await fetch(`${API}/api/generate-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.message || "AI generation failed");
      }

      setGeneratedProject(data);
      setIsSynthesized(true);

      toast({
        title: "Project Generated",
        description: "Your STEM project architecture is ready."
      });

      if (!isGuest) {
        await checkForNewAchievements();
      }

    } catch (err) {
      console.error(err);

      toast({
        title: "Generation Failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to generate project",
        variant: "destructive"
      });

    } finally {
      setIsGenerating(false);
    }
  }, [formData, isGuest, checkForNewAchievements]);

  /* ------------------------------
     Save Project
  ------------------------------ */

  const handleSaveProject = useCallback(async () => {
    if (!generatedProject) return;

    if (isGuest) {
      toast({
        title: "Login Required",
        description: "Sign in to save projects",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const saved = await projectService.saveProject({
        title: generatedProject.title,
        description: generatedProject.description,
        project_type: formData.projectType,
        difficulty: generatedProject.difficulty,
        estimated_time: generatedProject.estimatedTime,
        estimated_cost: generatedProject.estimatedCost,
        components: generatedProject.components,
        skills: generatedProject.skills,
        steps: generatedProject.steps,
        generated_from_params: formData as unknown as Record<string, string>
      });

      if (!saved) throw new Error("Save failed");

      setSavedProjectId(saved.id);

      toast({
        title: "Project Saved",
        description: "Added to your library."
      });

      await checkForNewAchievements();

      navigate("/library");

    } catch (err) {
      console.error(err);

      toast({
        title: "Save Failed",
        description: "Could not save project",
        variant: "destructive"
      });

    } finally {
      setIsSaving(false);
    }
  }, [generatedProject, formData, isGuest, navigate]);

  /* ------------------------------
     Veronica Code Generator
  ------------------------------ */

  const handleGenerateWithVeronica = useCallback(async () => {
    if (!generatedProject) return;

    if (!savedProjectId) {
      await handleSaveProject();
      return;
    }

    navigate(`/code-generator?project=${savedProjectId}`);
  }, [generatedProject, savedProjectId]);

  /* ------------------------------
     UI
  ------------------------------ */

  return (
    <Layout>

      <div className="container mx-auto py-16 max-w-6xl">

        <div className="flex flex-col gap-6">

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-gradient-primary text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <Zap className="mr-2" />
                Generate Architecture
              </>
            )}
          </Button>

          <CapsuleAnimation isOpen={isSynthesized && generatedProject !== null}>

            {generatedProject && (

              <HolographicCard
                intensity="low"
                enableTilt={false}
              >

                <Card className="glass-effect border-primary/10 shadow-md">

                  <CardContent className="p-8 space-y-6">

                    <h2 className="text-3xl font-bold">
                      {generatedProject.title}
                    </h2>

                    <p className="text-muted-foreground">
                      {generatedProject.description}
                    </p>

                    <div className="grid grid-cols-3 gap-4 text-sm">

                      <div>
                        <strong>Difficulty</strong>
                        <p>{generatedProject.difficulty}</p>
                      </div>

                      <div>
                        <strong>Timeline</strong>
                        <p>{generatedProject.estimatedTime}</p>
                      </div>

                      <div>
                        <strong>Budget</strong>
                        <p>{generatedProject.estimatedCost}</p>
                      </div>

                    </div>

                    <div>
                      <h4 className="font-bold mb-2">Components</h4>

                      <ul className="list-disc ml-6">
                        {generatedProject.components.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">Steps</h4>

                      <ol className="list-decimal ml-6">
                        {generatedProject.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex gap-4 pt-4">

                      <Button
                        onClick={handleSaveProject}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="animate-spin mr-2" />
                        ) : (
                          <Save className="mr-2" />
                        )}

                        Save Lab
                      </Button>

                      <Button
                        onClick={handleGenerateWithVeronica}
                        className="bg-purple-600 text-white"
                      >
                        <Code className="mr-2" />
                        Generate with Veronica AI
                      </Button>

                    </div>

                  </CardContent>

                </Card>

              </HolographicCard>

            )}

          </CapsuleAnimation>

        </div>

      </div>

    </Layout>
  );
};

export default Generator;
