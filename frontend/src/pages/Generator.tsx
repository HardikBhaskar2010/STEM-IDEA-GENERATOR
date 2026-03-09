import React, { useState, useCallback } from "react"
import Layout from "@/components/layout/Layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import { Zap, Loader2, Save, Code } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CapsuleAnimation } from "@/components/ui/capsule-animation"
import { HolographicCard } from "@/components/HolographicCard"
import { projectService } from "@/services/projectService"
import { useNavigate } from "react-router-dom"

type Project = {
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  estimatedCost: string
  components: string[]
  skills: string[]
  steps: string[]
}

type FormData = {
  projectType: string
  skillLevel: string
  interests: string
  budget: string
  duration: string
}

const Generator: React.FC = () => {
  const navigate = useNavigate()

  const [formData, setFormData] = useState<FormData>({
    projectType: "",
    skillLevel: "",
    interests: "",
    budget: "",
    duration: "",
  })

  const [project, setProject] = useState<Project | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null)

  const API =
    import.meta.env.VITE_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    ""

  const handleGenerate = useCallback(async () => {
    if (!formData.projectType || !formData.skillLevel) {
      toast({
        title: "Missing information",
        description: "Please select project domain and skill level",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const res = await fetch(`${API}/api/generate-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.message || "AI generation failed")
      }

      const generated = data.project || data

      setProject(generated)

      toast({
        title: "Project generated",
        description: "Your AI architecture is ready.",
      })
    } catch (err) {
      console.error(err)

      toast({
        title: "Generation failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to generate project",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [formData])

  const handleSave = useCallback(async () => {
    if (!project) return

    setIsSaving(true)

    try {
      const saved = await projectService.saveProject({
        title: project.title,
        description: project.description,
        project_type: formData.projectType,
        difficulty: project.difficulty,
        estimated_time: project.estimatedTime,
        estimated_cost: project.estimatedCost,
        components: project.components,
        skills: project.skills,
        steps: project.steps,
      })

      setSavedProjectId(saved.id)

      toast({
        title: "Project saved",
        description: "Added to your library.",
      })
    } catch {
      toast({
        title: "Save failed",
        description: "Could not save project",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [project])

  const openVeronica = () => {
    if (!savedProjectId) {
      toast({
        title: "Save project first",
        description: "Veronica needs a saved project.",
      })
      return
    }

    navigate(`/code-generator?project=${savedProjectId}`)
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl py-16">

        <h1 className="text-5xl font-bold text-gradient mb-12">
          Project Lab
        </h1>

        <div className="grid lg:grid-cols-12 gap-8">

          {/* FORM PANEL */}

          <div className="lg:col-span-5">
            <Card className="glass-effect border-primary/10">
              <CardContent className="p-8 space-y-6">

                <h2 className="text-xl font-bold">Specifications</h2>

                <div>
                  <label className="text-sm">Domain</label>

                  <Select
                    value={formData.projectType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, projectType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose domain" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="robotics">Robotics</SelectItem>
                      <SelectItem value="iot">IoT</SelectItem>
                      <SelectItem value="electronics">
                        Electronics
                      </SelectItem>
                      <SelectItem value="ai">AI / ML</SelectItem>
                      <SelectItem value="web">Web Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm">Skill Level</label>

                  <Select
                    value={formData.skillLevel}
                    onValueChange={(v) =>
                      setFormData({ ...formData, skillLevel: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">
                        Intermediate
                      </SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm">Idea / Goal</label>

                  <Textarea
                    value={formData.interests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interests: e.target.value,
                      })
                    }
                    placeholder="What problem should this project solve?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Budget"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="Timeline"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: e.target.value,
                      })
                    }
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full h-14 text-lg"
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

              </CardContent>
            </Card>
          </div>

          {/* RESULT PANEL */}

          <div className="lg:col-span-7">

            <CapsuleAnimation isOpen={project !== null}>

              {project && (

                <HolographicCard intensity="low" enableTilt={false}>

                  <Card className="glass-effect border-primary/10">

                    <CardContent className="p-10 space-y-6">

                      <h2 className="text-3xl font-bold">
                        {project.title}
                      </h2>

                      <p className="text-muted-foreground">
                        {project.description}
                      </p>

                      <div className="grid grid-cols-3 gap-6">

                        <div>
                          <b>Difficulty</b>
                          <p>{project.difficulty}</p>
                        </div>

                        <div>
                          <b>Timeline</b>
                          <p>{project.estimatedTime}</p>
                        </div>

                        <div>
                          <b>Budget</b>
                          <p>{project.estimatedCost}</p>
                        </div>

                      </div>

                      <div>
                        <h4 className="font-bold">Components</h4>

                        <ul className="list-disc ml-6">
                          {project.components.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-bold">Steps</h4>

                        <ol className="list-decimal ml-6">
                          {project.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="flex gap-4 pt-6">

                        <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving ? (
                            <Loader2 className="animate-spin mr-2" />
                          ) : (
                            <Save className="mr-2" />
                          )}
                          Save Lab
                        </Button>

                        <Button
                          onClick={openVeronica}
                          className="bg-purple-600 text-white"
                        >
                          <Code className="mr-2" />
                          Generate with Veronica
                        </Button>

                      </div>

                    </CardContent>

                  </Card>

                </HolographicCard>

              )}

            </CapsuleAnimation>

          </div>

        </div>

      </div>
    </Layout>
  )
}

export default Generator
