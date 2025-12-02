import Stoplight from './components/Stoplight'

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Stoplight 
        colors={['#ef4444', '#facc15', '#22c55e', '#a855f7']}
        timings={[1000, 1000, 1000, 1000]} 
        sequence={[0,1,2,3,2,1,0]}
        initialLight={1}
      />
    </div>
  )
}

export default App
