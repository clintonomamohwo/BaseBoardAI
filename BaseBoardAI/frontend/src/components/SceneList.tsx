import type { StoryboardScene } from '../types/storyboard'

interface Props {
  scenes: StoryboardScene[]
  activeSceneNumber: number
  onSelectScene: (scene: StoryboardScene) => void
}

export default function SceneList({ scenes, activeSceneNumber, onSelectScene }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
        Screenplay Scenes
      </h3>
      <div className="space-y-2">
        {scenes.map((scene) => {
          const active = scene.scene_number === activeSceneNumber
          return (
            <button
              key={scene.scene_number}
              onClick={() => onSelectScene(scene)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 ${
                active
                  ? 'bg-[#2D1B69] text-white shadow-md shadow-[#2D1B69]/10'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${active ? 'bg-[#00D4FF]' : 'bg-slate-300 dark:bg-slate-600'}`} />
              <span className="text-sm font-medium truncate">
                Scene {scene.scene_number}: {scene.location_heading}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
